import { network } from "hardhat";
import { createHash } from "node:crypto";
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

function abiHash(artifactPath: string) {
  if (!existsSync(artifactPath)) return "";
  const artifact = readJson(artifactPath);
  return createHash("sha256").update(JSON.stringify(artifact.abi)).digest("hex");
}

function writeRegistry() {
  const deploymentDir = join(process.cwd(), "deployments", "sepolia");
  const contracts = [
    {
      name: "CarPass",
      deploymentFile: "CarPass.json",
      artifactPath: join(process.cwd(), "artifacts", "contracts", "CarPass.sol", "CarPass.json"),
    },
    {
      name: "VehicleParts",
      deploymentFile: "VehicleParts.json",
      artifactPath: join(process.cwd(), "artifacts", "contracts", "VehicleParts.sol", "VehicleParts.json"),
    },
    {
      name: "CarPassOracle",
      deploymentFile: "CarPassOracle.json",
      artifactPath: join(process.cwd(), "artifacts", "contracts", "CarPassOracle.sol", "CarPassOracle.json"),
    },
  ];

  const registry: {
    network: string;
    generatedAt: string;
    contracts: Record<string, unknown>;
  } = {
    network: "sepolia",
    generatedAt: new Date().toISOString(),
    contracts: {},
  };

  for (const contract of contracts) {
    const deploymentPath = join(deploymentDir, contract.deploymentFile);
    const deployment = existsSync(deploymentPath)
      ? readJson(deploymentPath)
      : { contractName: contract.name, network: "sepolia", address: "" };

    registry.contracts[contract.name] = {
      contractName: contract.name,
      network: deployment.network ?? "sepolia",
      chainId: deployment.chainId ?? "",
      address: deployment.address ?? "",
      transactionHash: deployment.transactionHash ?? "",
      blockNumber: deployment.blockNumber ?? null,
      deployedAt: deployment.deployedAt ?? "",
      deployer: deployment.deployer ?? "",
      carPassAddress: deployment.carPassAddress ?? "",
      artifactPath: contract.artifactPath,
      artifactPresent: existsSync(contract.artifactPath),
      abiSha256: abiHash(contract.artifactPath),
    };
  }

  writeFileSync(join(deploymentDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
}

const carPassAddress = resolveCarPassAddress();
if (!ethers.isAddress(carPassAddress)) {
  throw new Error(`Invalid CarPass address: ${carPassAddress}`);
}

const [deployer] = await ethers.getSigners();

console.log("Deploying CarPassOracle with account:", deployer.address);
console.log("Linked CarPass address:", carPassAddress);

const oracle = await ethers.deployContract("CarPassOracle", [carPassAddress]);
await oracle.waitForDeployment();

const address = await oracle.getAddress();
const deploymentTx = oracle.deploymentTransaction();
const receipt = deploymentTx === null ? null : await deploymentTx.wait();
const chain = await ethers.provider.getNetwork();

console.log("CarPassOracle deployed to:", address);
if (deploymentTx !== null) {
  console.log("Deployment tx:", deploymentTx.hash);
}

const deploymentDir = join(process.cwd(), "deployments", "sepolia");
mkdirSync(deploymentDir, { recursive: true });
writeFileSync(
  join(deploymentDir, "CarPassOracle.json"),
  `${JSON.stringify(
    {
      contractName: "CarPassOracle",
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

writeRegistry();

console.log("Deployment artifact written to deployments/sepolia/CarPassOracle.json");
console.log("Deployment registry written to deployments/sepolia/registry.json");
