const { ethers } = require("ethers");
require("dotenv").config();

const path = require("path");
const fs = require("fs");

// Load contract ABI
const artifactPath = path.join(
  __dirname,
  "../blockchain/artifacts/contracts/ReviewRegistry.sol/ReviewRegistry.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

const contract = new ethers.Contract(
  process.env.REVIEW_REGISTRY_ADDRESS,
  artifact.abi,
  provider
);

async function checkReview() {
  const reviewKey = process.argv[2];

  if (!reviewKey) {
    console.log("Usage: node checkReview.js <reviewKey>");
    return;
  }

  const result = await contract.getReview(reviewKey);

  console.log("Review Hash:", result[0]);
  console.log("IPFS CID:", result[1]);
  console.log("Exists:", result[2]);
}

checkReview().catch((error) => {
  console.error("Check failed:", error.message);
});