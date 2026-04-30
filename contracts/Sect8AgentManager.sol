// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Sect8AgentManager
 * @dev Implements Agentic ID logic for the 0G APAC Hackathon.
 * Links a persistent agent identity to a metadata root stored on 0G Storage.
 */
contract Sect8AgentManager is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    // Mapping from TokenID to the latest 0G Storage DataRoot
    mapping(uint256 => string) public agentMemoryRoot;

    event AgentInitialized(uint256 indexed tokenId, address indexed owner, string memoryRoot);
    event AgentStateUpdated(uint256 indexed tokenId, string newDataRoot);
    event DecisionLogged(uint256 indexed tokenId, string propertyId, uint256 score, uint256 timestamp, string dataRoot);

    constructor() ERC721("Sect8 AI Agent", "S8A") Ownable(msg.sender) {}

    /**
     * @dev Mints a new Agentic ID and links it to an initial state on 0G Storage.
     */
    function initializeAgent(address owner, string memory initialMemoryRoot) public returns (uint256) {
        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _mint(owner, newItemId);
        agentMemoryRoot[newItemId] = initialMemoryRoot;

        emit AgentInitialized(newItemId, owner, initialMemoryRoot);
        return newItemId;
    }

    /**
     * @dev Updates the agent's memory root (Verifiable Memory Layer).
     */
    function updateAgentState(uint256 tokenId, string memory newDataRoot) public {
        address owner = ownerOf(tokenId);
        require(_isAuthorized(owner, msg.sender, tokenId), "Not authorized to update agent state");
        agentMemoryRoot[tokenId] = newDataRoot;
        emit AgentStateUpdated(tokenId, newDataRoot);
    }

    /**
     * @dev Log an agent decision on-chain. Callable by owner or approved operator.
     */
    function logDecision(uint256 tokenId, string calldata propertyId, uint256 score, string calldata dataRoot) external {
        address owner = ownerOf(tokenId);
        require(_isAuthorized(owner, msg.sender, tokenId), "Not authorized to log decision");
        emit DecisionLogged(tokenId, propertyId, score, block.timestamp, dataRoot);
    }

    /**
     * @dev Verifies if a memory root matches the on-chain record.
     */
    function verifyAgentState(uint256 tokenId, string memory rootToVerify) public view returns (bool) {
        return keccak256(abi.encodePacked(agentMemoryRoot[tokenId])) == keccak256(abi.encodePacked(rootToVerify));
    }
}
