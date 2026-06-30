import { network } from "hardhat";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { ethers } = await network.create();

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function resolveCarPassAddress() {
  const envAddress =
    process.env.CARPASS_CONTRACT_ADDRESS ??
    process.env.VITE_CARPASS_CONTRACT_ADDRESS;
  if (envAddress) return envAddress;

  const deploymentPath = join(process.cwd(), "deployments", "sepolia", "CarPass.json");
  if (existsSync(deploymentPath)) {
    return readJson(deploymentPath).address as string;
  }

  throw new Error(
    "CarPass address not configured. Set CARPASS_CONTRACT_ADDRESS or run deploy:sepolia first.",
  );
}

const carPassAddress = resolveCarPassAddress();
if (!ethers.isAddress(carPassAddress)) {
  throw new Error(`Invalid CarPass address: ${carPassAddress}`);
}

const [deployer] = await ethers.getSigners();

console.log("Deploying VehicleParts with account:", deployer.address);
console.log("Linked CarPass address:", carPassAddress);

const vehicleParts = await ethers.deployContract("VehicleParts", [carPassAddress]);
await vehicleParts.waitForDeployment();

const address = await vehicleParts.getAddress();
const deploymentTx = vehicleParts.deploymentTransaction();
const receipt = deploymentTx === null ? null : await deploymentTx.wait();
const chain = await ethers.provider.getNetwork();

console.log("VehicleParts deployed to:", address);
if (deploymentTx !== null) {
  console.log("Deployment tx:", deploymentTx.hash);
}

const deploymentDir = join(process.cwd(), "deployments", "sepolia");
mkdirSync(deploymentDir, { recursive: true });
writeFileSync(
  join(deploymentDir, "VehicleParts.json"),
  `${JSON.stringify(
    {
      contractName: "VehicleParts",
      network: "sepolia",
      chainId: chain.chainId.toString(),
      address,
      carPassAddress,
      deployer: deployer.address,
      transactionHash: deploymentTx?.hash ?? "",
      blockNumber: receipt?.blockNumber ?? null,
      deployedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log("Deployment artifact written to deployments/sepolia/VehicleParts.json");
