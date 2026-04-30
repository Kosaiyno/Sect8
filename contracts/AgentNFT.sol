// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentNFT is ERC721, Ownable {
    uint256 private _nextId = 1;

    struct AgentMeta {
        string memoryRoot;
        string encryptedURI;
    }

    mapping(uint256 => AgentMeta) public meta;

    event AgentInitialized(uint256 indexed tokenId, address indexed owner, string memoryRoot);
    event AgentStateUpdated(uint256 indexed tokenId, string memoryRoot);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable(msg.sender) {}

    function mintAgent(string memory initialMemoryRoot, string memory encryptedURI) public returns (uint256) {
        uint256 id = _nextId++;
        _safeMint(msg.sender, id);
        meta[id] = AgentMeta({ memoryRoot: initialMemoryRoot, encryptedURI: encryptedURI });
        emit AgentInitialized(id, msg.sender, initialMemoryRoot);
        return id;
    }

    function updateAgentState(uint256 tokenId, string memory newMemoryRoot) public {
        require(_isAuthorized(msg.sender, tokenId), "not owner or approved");
        meta[tokenId].memoryRoot = newMemoryRoot;
        emit AgentStateUpdated(tokenId, newMemoryRoot);
    }

    function _isAuthorized(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        if (spender == owner) return true;
        if (getApproved(tokenId) == spender) return true;
        if (isApprovedForAll(owner, spender)) return true;
        return false;
    }

    function getAgentMemoryRoot(uint256 tokenId) public view returns (string memory) {
        return meta[tokenId].memoryRoot;
    }
}
