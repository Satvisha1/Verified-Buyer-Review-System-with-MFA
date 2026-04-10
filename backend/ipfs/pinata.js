const axios = require("axios");

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

exports.uploadJSONToIPFS = async (jsonData) => {
  try {
    if (!PINATA_JWT) {
      throw new Error("PINATA_JWT environment variable is missing");
    }

    if (!jsonData || typeof jsonData !== "object" || Array.isArray(jsonData)) {
      throw new Error("Invalid JSON data for IPFS upload");
    }

    // Normalize payload to avoid accidental undefined values / inconsistent structure
    const normalizedData = JSON.parse(JSON.stringify(jsonData));

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataContent: normalizedData,
        pinataMetadata: {
          name: `review-${Date.now()}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const cid = response?.data?.IpfsHash;

    if (!cid) {
      throw new Error("Pinata did not return a valid IPFS CID");
    }

    return {
      cid,
      url: `${PINATA_GATEWAY}/${cid}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("PINATA ERROR:");
    console.error(error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error?.reason ||
        error.response?.data?.message ||
        error.message ||
        "Failed to upload JSON to IPFS"
    );
  }
};