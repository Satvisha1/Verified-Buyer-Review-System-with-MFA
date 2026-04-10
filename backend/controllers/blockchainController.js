const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const Review = require("../models/Review");
const axios = require("axios");
const crypto = require("crypto");
const { getProductScoreFromChain } = require("../blockchain/reviewRegistry");

function getContractArtifact() {
  const artifactPath = path.join(
    __dirname,
    "../../blockchain/artifacts/contracts/ReviewRegistry.sol/ReviewRegistry.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error("ReviewRegistry artifact not found. Compile contract first.");
  }

  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

function getProvider() {
  if (!process.env.BLOCKCHAIN_RPC_URL) {
    throw new Error("BLOCKCHAIN_RPC_URL missing in .env");
  }

  return new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
}

function getReadOnlyContract(contractAddress) {
  if (!contractAddress) {
    throw new Error("Contract address is required");
  }

  const artifact = getContractArtifact();
  const provider = getProvider();

  return new ethers.Contract(contractAddress, artifact.abi, provider);
}

function normalizeHash(value) {
  if (!value) return "";
  const str = String(value).toLowerCase();
  return str.startsWith("0x") ? str : `0x${str}`;
}

exports.checkReviewOnBlockchain = async (req, res) => {
  try {
    const { reviewKey } = req.params;

    if (!reviewKey || !reviewKey.trim()) {
      return res.status(400).json({ message: "reviewKey is required" });
    }

    const cleanReviewKey = reviewKey.trim();
    const review = await Review.findOne({ reviewKey: cleanReviewKey }).lean();

    const contractAddress =
      review?.contractAddress || process.env.REVIEW_REGISTRY_ADDRESS;

    if (!contractAddress) {
      return res.status(500).json({
        message: "No contract address available for blockchain lookup",
      });
    }

    const contract = getReadOnlyContract(contractAddress);
    const result = await contract.getReview(cleanReviewKey);

    const onChainHashRaw = result[0];
    const onChainCidRaw = result[1];
    const exists = result[2];

    const dbHash = normalizeHash(review?.reviewHash);
    const onChainHash = normalizeHash(onChainHashRaw);

    const dbCid = review?.ipfsCid ? String(review.ipfsCid) : "";
    const onChainCid = onChainCidRaw ? String(onChainCidRaw) : "";

    const dbMatchesBlockchain =
      !!review && !!dbHash && !!onChainHash && dbHash === onChainHash;

    const cidMatches =
      !!review && !!dbCid && !!onChainCid && dbCid === onChainCid;

    let ipfsFetched = false;
    let ipfsHash = null;
    let ipfsMatchesDb = false;
    let ipfsMatchesBlockchain = false;

    try {
      if (onChainCid) {
        const gateway =
          process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

        const ipfsUrl = `${gateway}/${onChainCid}`;

        const ipfsRes = await axios.get(ipfsUrl, { timeout: 5000 });

        const ipfsDataString = JSON.stringify(ipfsRes.data);

        const calculatedHash = crypto
          .createHash("sha256")
          .update(ipfsDataString)
          .digest("hex");

        ipfsFetched = true;
        ipfsHash = calculatedHash;

        ipfsMatchesDb =
          !!dbHash && calculatedHash === dbHash.replace("0x", "");

        ipfsMatchesBlockchain =
          !!onChainHash && calculatedHash === onChainHash.replace("0x", "");
      }
    } catch (err) {
      console.error("IPFS verification failed:", err.message);
    }

    const verified =
      !!exists && dbMatchesBlockchain && cidMatches && ipfsMatchesBlockchain;

    return res.json({
      reviewKey: cleanReviewKey,
      verified,

      contractAddress,
      blockchainNetwork: review?.blockchainNetwork || "sepolia",

      existsOnChain: exists,
      onChainStored: review?.onChainStored || false,

      dbReviewFound: !!review,
      txHash: review?.txHash || null,
      blockNumber: review?.blockNumber || null,

      dbHash: review?.reviewHash || null,
      onChainHash: onChainHashRaw || null,

      dbCid: review?.ipfsCid || null,
      onChainCid: onChainCidRaw || null,

      dbMatchesBlockchain,
      cidMatches,

      ipfsUrl: review?.ipfsUrl || null,

      ipfsFetched,
      ipfsHash,
      ipfsMatchesDb,
      ipfsMatchesBlockchain,
    });
  } catch (error) {
    console.error("Blockchain review check failed:", error);
    return res.status(500).json({
      message: "Failed to check review on blockchain",
      error: error.message,
    });
  }
};

exports.getProductBlockchainScore = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !String(productId).trim()) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const score = await getProductScoreFromChain(String(productId).trim());

    return res.status(200).json({
      productId: String(productId).trim(),
      score: {
        totalRating: Number(score.totalRating || 0),
        reviewCount: Number(score.reviewCount || 0),
        averageRatingScaled: Number(score.averageRatingScaled || 0),
        averageRating: Number(score.averageRating || 0),
      },
      source: "blockchain",
      contractAddress: process.env.REVIEW_REGISTRY_ADDRESS || null,
      network: process.env.BLOCKCHAIN_NETWORK || "sepolia",
      label: "Blockchain-based verified buyer reputation score",
    });
  } catch (error) {
    console.error("getProductBlockchainScore error:", error);
    return res.status(500).json({
      message: "Failed to fetch blockchain product score",
      error: error.message,
    });
  }
};