// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * ZelfMarketplace V2
 *
 * Money flow on every sale:
 *   salePrice
 *     ├── platformFee   (platformFeeBps / 10000 * price)  → feeRecipient (Zelf treasury)
 *     ├── creatorRoyalty (from ERC-2981 royaltyInfo)       → royalty receiver (collection owner)
 *     └── sellerProceeds (remainder)                       → seller
 *
 * Listing: seller must approve this contract on the NFT first.
 * Listings expire after the specified duration.
 */
contract ZelfMarketplace is ReentrancyGuard, Ownable {
    // ── Storage ────────────────────────────────────────────────────────────────

    struct Listing {
        address seller;
        uint256 price;
        uint256 expiresAt; // unix timestamp; 0 = no expiry (legacy)
        bool active;
    }

    // nftAddress → tokenId → Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // nftAddress → tokenId → offerer → amount
    mapping(address => mapping(uint256 => mapping(address => uint256))) public offers;

    // Platform settings (owner-controlled)
    uint96 public platformFeeBps = 250; // 2.5%
    address public feeRecipient;

    // ── Events ─────────────────────────────────────────────────────────────────

    event ItemListed(address indexed nftAddress, uint256 indexed tokenId, address indexed seller, uint256 price, uint256 expiresAt);
    event ItemCanceled(address indexed nftAddress, uint256 indexed tokenId, address indexed seller);
    event ItemSold(address indexed nftAddress, uint256 indexed tokenId, address seller, address indexed buyer, uint256 price, uint256 platformFee, uint256 royalty);
    event OfferMade(address indexed nftAddress, uint256 indexed tokenId, address indexed offerer, uint256 price);
    event OfferCanceled(address indexed nftAddress, uint256 indexed tokenId, address indexed offerer);
    event OfferAccepted(address indexed nftAddress, uint256 indexed tokenId, address seller, address indexed offerer, uint256 price);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event PlatformFeeUpdated(uint96 oldBps, uint96 newBps);

    // ── Constructor ────────────────────────────────────────────────────────────

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        emit FeeRecipientUpdated(feeRecipient, _feeRecipient);
        feeRecipient = _feeRecipient;
    }

    /// @param bps Platform fee in basis points. Max 500 (5%).
    function setPlatformFee(uint96 bps) external onlyOwner {
        require(bps <= 500, "Max platform fee is 5%");
        emit PlatformFeeUpdated(platformFeeBps, bps);
        platformFeeBps = bps;
    }

    // ── Listing ────────────────────────────────────────────────────────────────

    /**
     * @param nftAddress  ERC-721 contract
     * @param tokenId     Token to list
     * @param price       Sale price in wei (BDAG)
     * @param duration    Listing duration in seconds (0 = no expiry)
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price,
        uint256 duration
    ) external nonReentrant {
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        require(price > 0, "Price must be > 0");

        uint256 expiresAt = duration > 0 ? block.timestamp + duration : 0;

        listings[nftAddress][tokenId] = Listing(msg.sender, price, expiresAt, true);
        emit ItemListed(nftAddress, tokenId, msg.sender, price, expiresAt);
    }

    function cancelListing(address nftAddress, uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[nftAddress][tokenId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.active, "Not listed");

        delete listings[nftAddress][tokenId];
        emit ItemCanceled(nftAddress, tokenId, msg.sender);
    }

    function getListing(address nftAddress, uint256 tokenId) external view returns (Listing memory) {
        return listings[nftAddress][tokenId];
    }

    // ── Buying ─────────────────────────────────────────────────────────────────

    function buyItem(address nftAddress, uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[nftAddress][tokenId];
        require(listing.active, "Not listed");
        require(listing.expiresAt == 0 || block.timestamp <= listing.expiresAt, "Listing expired");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        uint256 salePrice = listing.price;

        delete listings[nftAddress][tokenId];

        // Transfer NFT first (checks-effects-interactions)
        IERC721(nftAddress).safeTransferFrom(seller, msg.sender, tokenId);

        // Split payment
        (uint256 platformFee, uint256 royaltyAmount, uint256 sellerProceeds) =
            _splitPayment(nftAddress, tokenId, salePrice);

        // Pay creator royalty
        if (royaltyAmount > 0) {
            (, uint256 _royaltyAmt) = _getRoyaltyInfo(nftAddress, tokenId, salePrice);
            address royaltyReceiver = _getRoyaltyReceiver(nftAddress, tokenId, salePrice);
            if (royaltyReceiver != address(0) && _royaltyAmt > 0) {
                payable(royaltyReceiver).transfer(royaltyAmount);
            }
        }

        // Pay platform fee
        if (platformFee > 0) {
            payable(feeRecipient).transfer(platformFee);
        }

        // Pay seller
        payable(seller).transfer(sellerProceeds);

        // Refund overpayment
        uint256 overpaid = msg.value - salePrice;
        if (overpaid > 0) {
            payable(msg.sender).transfer(overpaid);
        }

        emit ItemSold(nftAddress, tokenId, seller, msg.sender, salePrice, platformFee, royaltyAmount);
    }

    // ── Offers ─────────────────────────────────────────────────────────────────

    function makeOffer(address nftAddress, uint256 tokenId) external payable nonReentrant {
        require(msg.value > 0, "Offer must be > 0");
        // Accumulate offers (allows topping up)
        offers[nftAddress][tokenId][msg.sender] += msg.value;
        emit OfferMade(nftAddress, tokenId, msg.sender, offers[nftAddress][tokenId][msg.sender]);
    }

    function cancelOffer(address nftAddress, uint256 tokenId) external nonReentrant {
        uint256 amount = offers[nftAddress][tokenId][msg.sender];
        require(amount > 0, "No offer");
        delete offers[nftAddress][tokenId][msg.sender];
        payable(msg.sender).transfer(amount);
        emit OfferCanceled(nftAddress, tokenId, msg.sender);
    }

    /**
     * Owner can reject an offer on their NFT. Refunds the offerer and removes the offer.
     * Use this when you want to decline low offers without waiting for the offerer to cancel.
     */
    function rejectOffer(address nftAddress, uint256 tokenId, address offerer) external nonReentrant {
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        uint256 amount = offers[nftAddress][tokenId][offerer];
        require(amount > 0, "No offer");
        delete offers[nftAddress][tokenId][offerer];
        payable(offerer).transfer(amount);
        emit OfferCanceled(nftAddress, tokenId, offerer);
    }

    function acceptOffer(address nftAddress, uint256 tokenId, address offerer) external nonReentrant {
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");

        uint256 amount = offers[nftAddress][tokenId][offerer];
        require(amount > 0, "No offer found");

        delete offers[nftAddress][tokenId][offerer];

        // Transfer NFT
        nft.safeTransferFrom(msg.sender, offerer, tokenId);

        // Split payment
        (uint256 platformFee, uint256 royaltyAmount, uint256 sellerProceeds) =
            _splitPayment(nftAddress, tokenId, amount);

        address royaltyReceiver = _getRoyaltyReceiver(nftAddress, tokenId, amount);
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            payable(royaltyReceiver).transfer(royaltyAmount);
        }
        if (platformFee > 0) {
            payable(feeRecipient).transfer(platformFee);
        }
        payable(msg.sender).transfer(sellerProceeds);

        emit OfferAccepted(nftAddress, tokenId, msg.sender, offerer, amount);
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    function _splitPayment(
        address nftAddress,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (uint256 platformFee, uint256 royaltyAmount, uint256 sellerProceeds) {
        platformFee = (salePrice * platformFeeBps) / 10000;

        (address royaltyReceiver, uint256 _royalty) = _getRoyaltyInfo(nftAddress, tokenId, salePrice);
        royaltyAmount = (royaltyReceiver != address(0)) ? _royalty : 0;

        uint256 deductions = platformFee + royaltyAmount;
        require(deductions <= salePrice, "Fees exceed price");
        sellerProceeds = salePrice - deductions;
    }

    function _getRoyaltyInfo(address nftAddress, uint256 tokenId, uint256 salePrice)
        internal
        view
        returns (address receiver, uint256 amount)
    {
        try IERC2981(nftAddress).royaltyInfo(tokenId, salePrice) returns (address r, uint256 a) {
            return (r, a);
        } catch {
            return (address(0), 0);
        }
    }

    function _getRoyaltyReceiver(address nftAddress, uint256 tokenId, uint256 salePrice)
        internal
        view
        returns (address receiver)
    {
        (receiver, ) = _getRoyaltyInfo(nftAddress, tokenId, salePrice);
    }

    // ── View helpers ───────────────────────────────────────────────────────────

    /**
     * Preview the fee breakdown for a given sale price.
     * Useful for the frontend to display "you'll receive X BDAG after fees".
     */
    function previewSplit(address nftAddress, uint256 tokenId, uint256 salePrice)
        external
        view
        returns (uint256 platformFee, uint256 royaltyAmount, uint256 sellerProceeds)
    {
        return _splitPayment(nftAddress, tokenId, salePrice);
    }
}
