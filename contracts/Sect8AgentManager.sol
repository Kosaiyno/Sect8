

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Sect8AgentManager is ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    mapping(uint256 => string) public agentMemoryRoot;

    event AgentInitialized(uint256 indexed tokenId, address indexed owner, string memoryRoot);
    event AgentStateUpdated(uint256 indexed tokenId, string newDataRoot);
    event DecisionLogged(uint256 indexed tokenId, string propertyId, uint256 score, uint256 timestamp, string dataRoot);

    constructor() ERC721("Sect8 AI Agent", "S8A") Ownable(msg.sender) {}

    function initializeAgent(address owner, string memory initialMemoryRoot) public returns (uint256) {
        _tokenIds++;
        uint256 newItemId = _tokenIds;
        _mint(owner, newItemId);
        agentMemoryRoot[newItemId] = initialMemoryRoot;
        emit AgentInitialized(newItemId, owner, initialMemoryRoot);
        return newItemId;
    }

    function updateAgentState(uint256 tokenId, string memory newDataRoot) public {
        address owner = ownerOf(tokenId);
        require(_isAuthorized(owner, msg.sender, tokenId), "Not authorized to update agent state");
        agentMemoryRoot[tokenId] = newDataRoot;
        emit AgentStateUpdated(tokenId, newDataRoot);
    }

    function logDecision(uint256 tokenId, string calldata propertyId, uint256 score, string calldata dataRoot) external {
        address owner = ownerOf(tokenId);
        require(_isAuthorized(owner, msg.sender, tokenId), "Not authorized to log decision");
        emit DecisionLogged(tokenId, propertyId, score, block.timestamp, dataRoot);
    }

    function verifyAgentState(uint256 tokenId, string memory rootToVerify) public view returns (bool) {
        return keccak256(abi.encodePacked(agentMemoryRoot[tokenId])) == keccak256(abi.encodePacked(rootToVerify));
    }

    // --- REQUIRED OVERRIDES FOR OPENZEPPELIN v5+ ---


    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, amount);
    }

    // _burn function removed as it is not virtual in OpenZeppelin v5+

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
