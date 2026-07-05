import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const NETWORK = "sepolia";
const deploymentDir = join(process.cwd(), "deployments", NETWORK);

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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function artifactMetadata(contract) {
  if (!existsSync(contract.artifactPath)) {
    return {
      artifactPath: contract.artifactPath,
      artifactPresent: false,
      abiSha256: "",
    };
  }

  const raw = readFileSync(contract.artifactPath, "utf8");
  const artifact = JSON.parse(raw);
  return {
    artifactPath: contract.artifactPath,
    artifactPresent: true,
    abiSha256: sha256(JSON.stringify(artifact.abi)),
  };
}

const registry = {
  network: NETWORK,
  generatedAt: new Date().toISOString(),
  contracts: {},
};

for (const contract of contracts) {
  const deploymentPath = join(deploymentDir, contract.deploymentFile);
  const deployment = existsSync(deploymentPath)
    ? readJson(deploymentPath)
    : { contractName: contract.name, network: NETWORK, address: "" };

  registry.contracts[contract.name] = {
    contractName: contract.name,
    network: deployment.network ?? NETWORK,
    chainId: deployment.chainId ?? "",
    address: deployment.address ?? "",
    transactionHash: deployment.transactionHash ?? "",
    blockNumber: deployment.blockNumber ?? null,
    deployedAt: deployment.deployedAt ?? "",
    deployer: deployment.deployer ?? "",
    carPassAddress: deployment.carPassAddress ?? "",
    ...artifactMetadata(contract),
  };
}

await mkdir(deploymentDir, { recursive: true });
await writeFile(join(deploymentDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);

console.log("Deployment registry written to deployments/sepolia/registry.json");
