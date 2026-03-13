// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * ZelfNFT — ERC-721 with ERC-2981 royalty support.
 * Deployed per-collection by ZelfNFTFactory.
 * - royaltyBps: basis points (250 = 2.5%, 1000 = 10%, max 1000)
 * - Only the collection owner can mint.
 */
contract ZelfNFT is ERC721URIStorage, ERC721Royalty, Ownable {
    uint256 private _nextTokenId;
    uint256 public maxSupply;
    string public baseURI;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        address initialOwner,
        uint96 royaltyBps
    ) ERC721(name, symbol) Ownable(initialOwner) {
        maxSupply = _maxSupply;
        // Cap royalty at 10%
        uint96 bps = royaltyBps > 1000 ? 1000 : royaltyBps;
        _setDefaultRoyalty(initialOwner, bps);
    }

    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        require(tokenId < maxSupply || maxSupply == 0, "Max supply reached");
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    function batchMint(address to, string[] memory uris) public onlyOwner {
        require((_nextTokenId + uris.length) <= maxSupply || maxSupply == 0, "Max supply reached");
        for (uint256 i = 0; i < uris.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uris[i]);
        }
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    /// @dev Update royalty recipient and rate (collection owner only)
    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        _setDefaultRoyalty(receiver, bps);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory uri) public onlyOwner {
        baseURI = uri;
    }

    // --- Required overrides to resolve diamond inheritance ---

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}

contract ZelfNFTFactory is Ownable {
    event CollectionCreated(
        address indexed collectionAddress,
        string name,
        string symbol,
        address indexed owner,
        uint96 royaltyBps
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @param name        Collection name
     * @param symbol      Token symbol
     * @param maxSupply   0 = unlimited
     * @param royaltyBps  Royalty in basis points (e.g. 500 = 5%). Max 1000 (10%).
     */
    function createCollection(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint96 royaltyBps
    ) public returns (address) {
        ZelfNFT newCollection = new ZelfNFT(name, symbol, maxSupply, msg.sender, royaltyBps);
        emit CollectionCreated(address(newCollection), name, symbol, msg.sender, royaltyBps);
        return address(newCollection);
    }
}
