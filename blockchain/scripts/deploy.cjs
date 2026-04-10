const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return "";

  const envContent = fs.readFileSync(filePath, "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));

  return match ? match[1].trim() : "";
}

function updateEnvFile(filePath, contractAddress) {
  try {
    let envContent = "";

    if (fs.existsSync(filePath)) {
      envContent = fs.readFileSync(filePath, "utf8");
    }

    if (/^REVIEW_REGISTRY_ADDRESS=.*/m.test(envContent)) {
      envContent = envContent.replace(
        /^REVIEW_REGISTRY_ADDRESS=.*/m,
        `REVIEW_REGISTRY_ADDRESS=${contractAddress}`
      );
    } else {
      if (envContent.length > 0 && !envContent.endsWith("\n")) {
        envContent += "\n";
      }
      envContent += `REVIEW_REGISTRY_ADDRESS=${contractAddress}\n`;
    }

    fs.writeFileSync(filePath, envContent, "utf8");
    console.log(`Updated: ${filePath}`);
  } catch (error) {
    console.error(`Failed to update ${filePath}:`, error.message);
  }
}

async function main() {
  const blockchainEnvPath = path.join(__dirname, "../.env");
  const backendEnvPath = path.join(__dirname, "../../backend/.env");

  const existingBlockchainAddress = readEnvValue(
    blockchainEnvPath,
    "REVIEW_REGISTRY_ADDRESS"
  );
  const existingBackendAddress = readEnvValue(
    backendEnvPath,
    "REVIEW_REGISTRY_ADDRESS"
  );

  const forceRedeploy = process.env.FORCE_REDEPLOY === "true";

  if (!forceRedeploy) {
    if (existingBlockchainAddress || existingBackendAddress) {
      console.log("Existing contract address found.");
      console.log(
        "blockchain/.env:",
        existingBlockchainAddress || "(not set)"
      );
      console.log(
        "backend/.env   :",
        existingBackendAddress || "(not set)"
      );
      console.log("");
      console.log("Deployment stopped to prevent accidental new contract creation.");
      console.log(
        "If you really want a new contract, run with FORCE_REDEPLOY=true"
      );
      console.log("");
      console.log("Example:");
      console.log("FORCE_REDEPLOY=true npx hardhat run scripts/deploy.cjs --network sepolia");
      return;
    }
  }

  console.log("Deploying ReviewRegistry contract...");

  const ReviewRegistry = await hre.ethers.getContractFactory("ReviewRegistry");
  const registry = await ReviewRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("ReviewRegistry deployed to:", address);

  updateEnvFile(blockchainEnvPath, address);
  updateEnvFile(backendEnvPath, address);

  console.log("Deployment completed successfully.");
}

main().catch((error) => {
  console.error("Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});