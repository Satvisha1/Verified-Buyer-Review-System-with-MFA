// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReviewRegistry {
    address public owner;

    struct ReviewRecord {
        bytes32 reviewHash;
        string ipfsCid;
        bool exists;
    }

    struct ProductScore {
        uint256 totalRating;
        uint256 reviewCount;
        bool exists;
    }

    // reviewKey => whether this key is allowed to submit a review
    mapping(string => bool) private eligibleReviewKeys;

    // reviewKey => stored review record
    mapping(string => ReviewRecord) private reviews;

    // productId => on-chain score data
    mapping(string => ProductScore) private productScores;

    // reviewKey => productId
    mapping(string => string) private reviewKeyToProductId;

    event ReviewKeyAuthorized(string indexed reviewKey);
    event ReviewStored(string indexed reviewKey, bytes32 reviewHash, string ipfsCid);
    event ProductScoreUpdated(
        string indexed productId,
        uint256 totalRating,
        uint256 reviewCount,
        uint256 averageRatingScaled
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Authorize a delivered/verified review key before review submission
    function authorizeReviewKey(string memory reviewKey) external onlyOwner {
        require(bytes(reviewKey).length > 0, "Review key is required");
        require(!eligibleReviewKeys[reviewKey], "Review key already authorized");

        eligibleReviewKeys[reviewKey] = true;

        emit ReviewKeyAuthorized(reviewKey);
    }

    // Store review only if the key was previously authorized
    // Also updates on-chain product score using verified buyer rating
    function storeReview(
        string memory reviewKey,
        bytes32 reviewHash,
        string memory ipfsCid,
        string memory productId,
        uint256 rating
    ) external onlyOwner {
        require(bytes(reviewKey).length > 0, "Review key is required");
        require(reviewHash != bytes32(0), "Review hash is required");
        require(bytes(ipfsCid).length > 0, "IPFS CID is required");
        require(bytes(productId).length > 0, "Product ID is required");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(eligibleReviewKeys[reviewKey], "Review key is not authorized");
        require(!reviews[reviewKey].exists, "Review already stored for this key");

        reviews[reviewKey] = ReviewRecord({
            reviewHash: reviewHash,
            ipfsCid: ipfsCid,
            exists: true
        });

        reviewKeyToProductId[reviewKey] = productId;

        productScores[productId].totalRating += rating;
        productScores[productId].reviewCount += 1;
        productScores[productId].exists = true;

        uint256 averageRatingScaled = (productScores[productId].totalRating * 100) /
            productScores[productId].reviewCount;

        emit ReviewStored(reviewKey, reviewHash, ipfsCid);
        emit ProductScoreUpdated(
            productId,
            productScores[productId].totalRating,
            productScores[productId].reviewCount,
            averageRatingScaled
        );
    }

    function isReviewKeyAuthorized(string memory reviewKey) external view returns (bool) {
        return eligibleReviewKeys[reviewKey];
    }

    function getReviewHash(string memory reviewKey) external view returns (bytes32) {
        require(reviews[reviewKey].exists, "Review not found");
        return reviews[reviewKey].reviewHash;
    }

    function getReviewCid(string memory reviewKey) external view returns (string memory) {
        require(reviews[reviewKey].exists, "Review not found");
        return reviews[reviewKey].ipfsCid;
    }

    function getReview(string memory reviewKey)
        external
        view
        returns (bytes32 reviewHash, string memory ipfsCid, bool exists)
    {
        ReviewRecord memory record = reviews[reviewKey];
        return (record.reviewHash, record.ipfsCid, record.exists);
    }

    function getProductIdByReviewKey(string memory reviewKey)
        external
        view
        returns (string memory)
    {
        require(reviews[reviewKey].exists, "Review not found");
        return reviewKeyToProductId[reviewKey];
    }

    // Returns:
    // totalRating = sum of all verified buyer ratings
    // reviewCount = number of verified reviews stored on chain
    // averageRatingScaled = average * 100
    // Example: 4.25 => 425
    function getProductScore(string memory productId)
        external
        view
        returns (
            uint256 totalRating,
            uint256 reviewCount,
            uint256 averageRatingScaled
        )
    {
        ProductScore memory score = productScores[productId];

        if (!score.exists || score.reviewCount == 0) {
            return (0, 0, 0);
        }

        uint256 avgScaled = (score.totalRating * 100) / score.reviewCount;

        return (score.totalRating, score.reviewCount, avgScaled);
    }
}