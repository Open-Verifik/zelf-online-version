// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC8004IdentityRegistry
 * @dev ERC-721 based Identity Registry for Lawyers (ERC8004)
 * Each lawyer gets a unique NFT that represents their on-chain identity
 */
contract ERC8004IdentityRegistry is ERC721, Ownable {
    uint256 private _tokenIds;
    
    struct AgentIdentity {
        string name;
        string description;
        string agentCardURI;
        string[] capabilities;
        address agentAddress;
        uint256 createdAt;
        bool active;
    }
    
    mapping(uint256 => AgentIdentity) public agentIdentities;
    mapping(address => uint256) public agentToTokenId;
    mapping(uint256 => address) public tokenIdToAgent;
    
    event AgentRegistered(
        uint256 indexed tokenId,
        address indexed agentAddress,
        string name,
        string agentCardURI
    );
    
    event AgentUpdated(
        uint256 indexed tokenId,
        address indexed agentAddress,
        string agentCardURI
    );
    
    event AgentDeactivated(uint256 indexed tokenId, address indexed agentAddress);
    
    constructor() ERC721("Zelf Lawyer Identity", "ZLID") Ownable(msg.sender) {}
    
    /**
     * @dev Register a new lawyer and mint its identity NFT
     * @param agentAddress The address that will control this lawyer
     * @param name Lawyer name
     * @param description Lawyer description (specialization, etc.)
     * @param agentCardURI URI to the profile JSON metadata (IPFS)
     * @param capabilities Array of capability strings (specializations)
     * @return tokenId The minted token ID
     */
    function registerAgent(
        address agentAddress,
        string memory name,
        string memory description,
        string memory agentCardURI,
        string[] memory capabilities
    ) public onlyOwner returns (uint256) {
        require(agentToTokenId[agentAddress] == 0, "Agent already registered");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _mint(agentAddress, newTokenId);
        
        agentIdentities[newTokenId] = AgentIdentity({
            name: name,
            description: description,
            agentCardURI: agentCardURI,
            capabilities: capabilities,
            agentAddress: agentAddress,
            createdAt: block.timestamp,
            active: true
        });
        
        agentToTokenId[agentAddress] = newTokenId;
        tokenIdToAgent[newTokenId] = agentAddress;
        
        emit AgentRegistered(newTokenId, agentAddress, name, agentCardURI);
        
        return newTokenId;
    }
    
    /**
     * @dev Update lawyer metadata (only by owner or contract owner)
     */
    function updateAgent(
        uint256 tokenId,
        string memory agentCardURI,
        string[] memory capabilities
    ) public {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        require(
            ownerOf(tokenId) == msg.sender || msg.sender == owner(),
            "Not authorized to update"
        );
        
        agentIdentities[tokenId].agentCardURI = agentCardURI;
        agentIdentities[tokenId].capabilities = capabilities;
        
        emit AgentUpdated(tokenId, agentIdentities[tokenId].agentAddress, agentCardURI);
    }
    
    /**
     * @dev Deactivate a lawyer (only by contract owner)
     */
    function deactivateAgent(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        agentIdentities[tokenId].active = false;
        emit AgentDeactivated(tokenId, agentIdentities[tokenId].agentAddress);
    }
    
    function getAgentIdentity(uint256 tokenId) public view returns (AgentIdentity memory) {
        return agentIdentities[tokenId];
    }
    
    function getAgentTokenId(address agentAddress) public view returns (uint256) {
        return agentToTokenId[agentAddress];
    }
    
    /**
     * @dev Check if a lawyer is registered and active
     */
    function isAgentRegistered(address agentAddress) 
        public 
        view 
        returns (bool isRegistered, bool isActive, uint256 tokenId) 
    {
        tokenId = agentToTokenId[agentAddress];
        isRegistered = tokenId != 0;
        if (isRegistered) {
            isActive = agentIdentities[tokenId].active;
        }
    }
}
