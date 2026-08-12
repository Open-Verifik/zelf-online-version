// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC8004ReputationRegistry
 * @dev Reputation Registry for Lawyers (ERC8004)
 * Allows clients to submit feedback and ratings for lawyers
 */
contract ERC8004ReputationRegistry is Ownable {
    
    struct Feedback {
        address client;
        uint256 agentTokenId;
        uint8 rating;
        string[] tags;
        string comment;
        bytes32 paymentProof;
        uint256 timestamp;
        bool verified;
    }
    
    mapping(uint256 => Feedback) public feedbacks;
    mapping(uint256 => uint256[]) public agentFeedbacks;
    mapping(address => uint256[]) public clientFeedbacks;
    
    struct ReputationSummary {
        uint256 totalFeedbacks;
        uint256 verifiedFeedbacks;
        uint256 averageRating; // Scaled by 100 (e.g., 350 = 3.5)
        uint256 totalRatingSum;
        mapping(string => uint256) tagCounts;
    }
    
    mapping(uint256 => ReputationSummary) public agentReputations;
    
    uint256 private _feedbackCounter;
    
    address public identityRegistry;
    
    event FeedbackSubmitted(
        uint256 indexed feedbackId,
        uint256 indexed agentTokenId,
        address indexed client,
        uint8 rating,
        bytes32 paymentProof
    );
    
    event FeedbackVerified(uint256 indexed feedbackId, bool verified);
    
    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = _identityRegistry;
    }
    
    function setIdentityRegistry(address _identityRegistry) public onlyOwner {
        identityRegistry = _identityRegistry;
    }
    
    /**
     * @dev Submit feedback for a lawyer
     * @param agentTokenId The lawyer's identity token ID
     * @param rating Rating from 1-5
     * @param tags Array of tag strings
     * @param comment Optional text comment
     * @param paymentProof Hash of the payment transaction (optional, can be 0x0)
     * @return feedbackId The ID of the submitted feedback
     */
    function submitFeedback(
        uint256 agentTokenId,
        uint8 rating,
        string[] memory tags,
        string memory comment,
        bytes32 paymentProof
    ) public returns (uint256) {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(identityRegistry != address(0), "Identity registry not set");
        
        _feedbackCounter++;
        uint256 feedbackId = _feedbackCounter;
        
        bool verified = (paymentProof != bytes32(0));
        
        feedbacks[feedbackId] = Feedback({
            client: msg.sender,
            agentTokenId: agentTokenId,
            rating: rating,
            tags: tags,
            comment: comment,
            paymentProof: paymentProof,
            timestamp: block.timestamp,
            verified: verified
        });
        
        agentFeedbacks[agentTokenId].push(feedbackId);
        clientFeedbacks[msg.sender].push(feedbackId);
        
        ReputationSummary storage reputation = agentReputations[agentTokenId];
        reputation.totalFeedbacks++;
        if (verified) {
            reputation.verifiedFeedbacks++;
        }
        reputation.totalRatingSum += rating;
        reputation.averageRating = (reputation.totalRatingSum * 100) / reputation.totalFeedbacks;
        
        for (uint256 i = 0; i < tags.length; i++) {
            reputation.tagCounts[tags[i]]++;
        }
        
        emit FeedbackSubmitted(feedbackId, agentTokenId, msg.sender, rating, paymentProof);
        
        return feedbackId;
    }
    
    function verifyFeedback(uint256 feedbackId, bytes32 paymentProof) public onlyOwner {
        require(feedbacks[feedbackId].client != address(0), "Feedback does not exist");
        require(!feedbacks[feedbackId].verified, "Feedback already verified");
        require(paymentProof != bytes32(0), "Invalid payment proof");
        
        feedbacks[feedbackId].paymentProof = paymentProof;
        feedbacks[feedbackId].verified = true;
        
        uint256 agentTokenId = feedbacks[feedbackId].agentTokenId;
        agentReputations[agentTokenId].verifiedFeedbacks++;
        
        emit FeedbackVerified(feedbackId, true);
    }
    
    function getFeedback(uint256 feedbackId) public view returns (Feedback memory) {
        return feedbacks[feedbackId];
    }
    
    function getAgentFeedbacks(uint256 agentTokenId) public view returns (uint256[] memory) {
        return agentFeedbacks[agentTokenId];
    }
    
    /**
     * @dev Get reputation summary for a lawyer
     * @return totalFeedbacks Total number of feedbacks
     * @return verifiedFeedbacks Number of verified feedbacks
     * @return averageRating Average rating (scaled by 100)
     */
    function getReputationSummary(uint256 agentTokenId)
        public
        view
        returns (
            uint256 totalFeedbacks,
            uint256 verifiedFeedbacks,
            uint256 averageRating
        )
    {
        ReputationSummary storage reputation = agentReputations[agentTokenId];
        return (
            reputation.totalFeedbacks,
            reputation.verifiedFeedbacks,
            reputation.averageRating
        );
    }
    
    function getTagCount(uint256 agentTokenId, string memory tag)
        public
        view
        returns (uint256)
    {
        return agentReputations[agentTokenId].tagCounts[tag];
    }
}
