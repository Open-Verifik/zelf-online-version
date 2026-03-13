// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC8004ValidationRegistry
 * @dev Validation Registry for Lawyers (ERC8004)
 * Stores cryptographic proofs of license validation and credential verification
 */
contract ERC8004ValidationRegistry is Ownable {
    
    struct ValidationProof {
        uint256 agentTokenId;
        string taskId;
        bytes32 outputHash;
        bytes32 proofHash;
        address validator;
        ValidationType validationType;
        bool isValid;
        uint256 timestamp;
        string metadataURI;
    }
    
    enum ValidationType {
        NONE,
        LICENSE_VERIFICATION,
        BAR_EXAM,
        IDENTITY_CHECK,
        CREDENTIAL_VERIFICATION
    }
    
    mapping(uint256 => ValidationProof) public validations;
    mapping(uint256 => uint256[]) public agentValidations;
    mapping(string => uint256) public taskToValidation;
    mapping(bytes32 => uint256) public outputHashToValidation;
    
    uint256 private _validationCounter;
    
    address public identityRegistry;
    
    event ValidationRecorded(
        uint256 indexed validationId,
        uint256 indexed agentTokenId,
        string taskId,
        bytes32 outputHash,
        ValidationType validationType,
        bool isValid
    );
    
    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = _identityRegistry;
    }
    
    function setIdentityRegistry(address _identityRegistry) public onlyOwner {
        identityRegistry = _identityRegistry;
    }
    
    /**
     * @dev Record a validation proof for a lawyer's credential verification
     * @param agentTokenId The lawyer's identity token ID
     * @param taskId Unique task identifier
     * @param outputHash Hash of the validation output
     * @param proofHash Hash of the validation proof
     * @param validator Address of the validator
     * @param validationType Type of validation used
     * @param isValid Whether the validation passed
     * @param metadataURI URI to additional metadata (IPFS)
     * @return validationId The ID of the recorded validation
     */
    function recordValidation(
        uint256 agentTokenId,
        string memory taskId,
        bytes32 outputHash,
        bytes32 proofHash,
        address validator,
        ValidationType validationType,
        bool isValid,
        string memory metadataURI
    ) public returns (uint256) {
        require(identityRegistry != address(0), "Identity registry not set");
        require(taskToValidation[taskId] == 0, "Validation for this task already exists");
        
        _validationCounter++;
        uint256 validationId = _validationCounter;
        
        validations[validationId] = ValidationProof({
            agentTokenId: agentTokenId,
            taskId: taskId,
            outputHash: outputHash,
            proofHash: proofHash,
            validator: validator,
            validationType: validationType,
            isValid: isValid,
            timestamp: block.timestamp,
            metadataURI: metadataURI
        });
        
        agentValidations[agentTokenId].push(validationId);
        taskToValidation[taskId] = validationId;
        outputHashToValidation[outputHash] = validationId;
        
        emit ValidationRecorded(
            validationId,
            agentTokenId,
            taskId,
            outputHash,
            validationType,
            isValid
        );
        
        return validationId;
    }
    
    function getValidation(uint256 validationId) public view returns (ValidationProof memory) {
        return validations[validationId];
    }
    
    function getValidationByTask(string memory taskId) public view returns (uint256) {
        return taskToValidation[taskId];
    }
    
    function getValidationByOutput(bytes32 outputHash) public view returns (uint256) {
        return outputHashToValidation[outputHash];
    }
    
    function getAgentValidations(uint256 agentTokenId) public view returns (uint256[] memory) {
        return agentValidations[agentTokenId];
    }
    
    /**
     * @dev Get validation statistics for a lawyer
     */
    function getValidationStats(uint256 agentTokenId)
        public
        view
        returns (
            uint256 totalValidations,
            uint256 validCount,
            uint256 invalidCount
        )
    {
        uint256[] memory validationIds = agentValidations[agentTokenId];
        totalValidations = validationIds.length;
        
        for (uint256 i = 0; i < validationIds.length; i++) {
            if (validations[validationIds[i]].isValid) {
                validCount++;
            } else {
                invalidCount++;
            }
        }
    }
}
