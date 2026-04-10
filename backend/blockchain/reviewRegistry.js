const path = require("path");
const fs = require("fs");
const { ethers } = require("ethers");

const artifactPath = path.join(
  __dirname,
  "../../blockchain/artifacts/contracts/ReviewRegistry.sol/ReviewRegistry.json"
);

function getContractArtifact() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error("ReviewRegistry artifact not found. Compile blockchain project first.");
  }

  const fileContent = fs.readFileSync(artifactPath, "utf8");
  return JSON.parse(fileContent);
}

function getRpcUrl() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;

  if (!rpcUrl) {
    throw new Error("BLOCKCHAIN_RPC_URL missing in .env");
  }

  return rpcUrl;
}

function getPrivateKey() {
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY missing in .env");
  }

  return privateKey;
}

function getContractAddress() {
  const contractAddress = process.env.REVIEW_REGISTRY_ADDRESS;

  if (!contractAddress) {
    throw new Error("REVIEW_REGISTRY_ADDRESS missing in .env");
  }

  return contractAddress;
}

function getProvider() {
  const rpcUrl = getRpcUrl();
  console.log("Using BLOCKCHAIN_RPC_URL:", rpcUrl);

  return new ethers.JsonRpcProvider(rpcUrl);
}

function getWallet() {
  const provider = getProvider();
  const privateKey = getPrivateKey();

  return new ethers.Wallet(privateKey, provider);
}

function getReviewRegistryContract() {
  const artifact = getContractArtifact();
  const wallet = getWallet();
  const contractAddress = getContractAddress();

  console.log("Using REVIEW_REGISTRY_ADDRESS:", contractAddress);

  return new ethers.Contract(contractAddress, artifact.abi, wallet);
}

async function logNetworkInfo() {
  const provider = getProvider();
  const network = await provider.getNetwork();

  console.log("Connected network name:", network.name);
  console.log("Connected chainId:", network.chainId.toString());
}

function buildReviewKey(order, productId) {
  const deliveryCode = order.deliveryCode ? order.deliveryCode : "NO_CODE";
  return `${deliveryCode}_${String(productId)}`;
}

function formatHashForBlockchain(reviewHashHex) {
  if (!reviewHashHex) {
    throw new Error("Review hash is required");
  }

  if (reviewHashHex.startsWith("0x")) {
    return reviewHashHex;
  }

  return "0x" + reviewHashHex;
}

function extractReadableError(error) {
  if (!error) return "Unknown blockchain error";
  if (error.shortMessage) return error.shortMessage;
  if (error.reason) return error.reason;
  if (error.info?.error?.message) return error.info.error.message;
  if (error.message) return error.message;
  return "Unknown blockchain error";
}

async function authorizeReviewKeyOnChain(reviewKey) {
  if (!reviewKey) throw new Error("Review key is required");

  try {
    console.log("Authorizing review key on chain:", reviewKey);
    await logNetworkInfo();

    const contract = getReviewRegistryContract();
    const tx = await contract.authorizeReviewKey(reviewKey);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: await contract.getAddress(),
    };
  } catch (error) {
    console.error("authorizeReviewKeyOnChain error:", error);
    throw new Error(extractReadableError(error));
  }
}

// WITH SCORING
async function storeReviewOnChain(
  reviewKey,
  reviewHashHex,
  ipfsCid,
  productId,
  rating
) {
  if (!reviewKey) throw new Error("Review key is required");
  if (!reviewHashHex) throw new Error("Review hash is required");
  if (!ipfsCid) throw new Error("IPFS CID is required");
  if (!productId) throw new Error("Product ID is required");

  if (!rating || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  try {
    console.log("Storing review on chain for key:", reviewKey);
    await logNetworkInfo();

    const contract = getReviewRegistryContract();
    const formattedHash = formatHashForBlockchain(reviewHashHex);

    const tx = await contract.storeReview(
      reviewKey,
      formattedHash,
      ipfsCid,
      String(productId),
      Number(rating)
    );

    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: await contract.getAddress(),
    };
  } catch (error) {
    console.error("storeReviewOnChain error:", error);
    throw new Error(extractReadableError(error));
  }
}

async function isReviewKeyAuthorizedOnChain(reviewKey) {
  if (!reviewKey) throw new Error("Review key is required");

  try {
    const contract = getReviewRegistryContract();
    return await contract.isReviewKeyAuthorized(reviewKey);
  } catch (error) {
    console.error("isReviewKeyAuthorizedOnChain error:", error);
    throw new Error(extractReadableError(error));
  }
}

async function getReviewHashFromChain(reviewKey) {
  if (!reviewKey) throw new Error("Review key is required");

  try {
    const contract = getReviewRegistryContract();
    return await contract.getReviewHash(reviewKey);
  } catch (error) {
    console.error("getReviewHashFromChain error:", error);
    throw new Error(extractReadableError(error));
  }
}

async function getReviewCidFromChain(reviewKey) {
  if (!reviewKey) throw new Error("Review key is required");

  try {
    const contract = getReviewRegistryContract();
    return await contract.getReviewCid(reviewKey);
  } catch (error) {
    console.error("getReviewCidFromChain error:", error);
    throw new Error(extractReadableError(error));
  }
}

async function getReviewFromChain(reviewKey) {
  if (!reviewKey) throw new Error("Review key is required");

  try {
    const contract = getReviewRegistryContract();
    const result = await contract.getReview(reviewKey);

    return {
      reviewHash: result[0],
      ipfsCid: result[1],
      exists: result[2],
    };
  } catch (error) {
    console.error("getReviewFromChain error:", error);
    throw new Error(extractReadableError(error));
  }
}

// SCORING FETCH
async function getProductScoreFromChain(productId) {
  if (!productId) throw new Error("Product ID is required");

  try {
    const contract = getReviewRegistryContract();
    const result = await contract.getProductScore(String(productId));

    return {
      totalRating: Number(result[0]),
      reviewCount: Number(result[1]),
      averageRatingScaled: Number(result[2]),
      averageRating: Number(result[2]) / 100,
    };
  } catch (error) {
    console.error("getProductScoreFromChain error:", error);
    throw new Error(extractReadableError(error));
  }
}

module.exports = {
  buildReviewKey,
  authorizeReviewKeyOnChain,
  storeReviewOnChain,
  isReviewKeyAuthorizedOnChain,
  getReviewHashFromChain,
  getReviewCidFromChain,
  getReviewFromChain,
  getProductScoreFromChain,
};