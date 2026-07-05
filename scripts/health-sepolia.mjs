import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ethers } from "ethers";

const NETWORK = "sepolia";
const EXPECTED_CHAIN_ID = 11155111n;

const contracts = [
  {
    name: "CarPass",
    envKeys: ["CARPASS_CONTRACT_ADDRESS", "VITE_CARPASS_CONTRACT_ADDRESS"],
    deploymentFile: "CarPass.json",
    artifactPath: join(process.cwd(), "artifacts", "contracts", "CarPass.sol", "CarPass.json"),
    required: true,
  },
  {
    name: "VehicleParts",
    envKeys: ["VEHICLEPARTS_CONTRACT_ADDRESS", "VITE_VEHICLEPARTS_CONTRACT_ADDRESS"],
    deploymentFile: "VehicleParts.json",
    artifactPath: join(process.cwd(), "artifacts", "contracts", "VehicleParts.sol", "VehicleParts.json"),
    required: true,
  },
  {
    name: "CarPassOracle",
    envKeys: ["CARPASS_ORACLE_CONTRACT_ADDRESS", "VITE_CARPASS_ORACLE_CONTRACT_ADDRESS"],
    deploymentFile: "CarPassOracle.json",
    artifactPath: join(process.cwd(), "artifacts", "contracts", "CarPassOracle.sol", "CarPassOracle.json"),
    required: true,
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isPlaceholder(value) {
  return (
    value === undefined ||
    value.trim() === "" ||
    /YOUR_PROJECT_ID|your_private_key|optional/i.test(value)
  );
}

function report(name, ok, detail) {
  console.log(`${ok ? "OK" : "FAIL"} ${name}: ${detail}`);
  return ok;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function artifactAbiHash(contract) {
  if (!existsSync(contract.artifactPath)) return "";
  const artifact = readJson(contract.artifactPath);
  return sha256(JSON.stringify(artifact.abi));
}

function loadAbi(contract) {
  if (!existsSync(contract.artifactPath)) {
    throw new Error(`Missing artifact for ${contract.name}. Run npm run compile first.`);
  }
  return readJson(contract.artifactPath).abi;
}

function resolveDeployment(contract) {
  const deploymentPath = join(process.cwd(), "deployments", NETWORK, contract.deploymentFile);
  return existsSync(deploymentPath) ? readJson(deploymentPath) : {};
}

function resolveAddress(contract, deployment) {
  for (const key of contract.envKeys) {
    const envAddress = process.env[key];
    if (envAddress && !isPlaceholder(envAddress)) return envAddress;
  }
  return deployment.address ?? "";
}

const rpcUrl = process.env.SEPOLIA_RPC_URL;
let failed = false;

function check(name, ok, detail) {
  const passed = report(name, ok, detail);
  if (!passed) failed = true;
}

if (isPlaceholder(rpcUrl)) {
  check("SEPOLIA_RPC_URL", false, "missing or placeholder");
  process.exitCode = 1;
  process.exit();
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const resolved = {};

try {
  const network = await provider.getNetwork();
  check("Sepolia chain id", network.chainId === EXPECTED_CHAIN_ID, network.chainId.toString());
} catch (error) {
  check(
    "Sepolia RPC connection",
    false,
    error instanceof Error ? error.message : "connection failed",
  );
}

for (const contract of contracts) {
  const deployment = resolveDeployment(contract);
  const address = resolveAddress(contract, deployment);
  const abiHash = artifactAbiHash(contract);

  resolved[contract.name] = {
    address,
    deployment,
    abiHash,
    abi: existsSync(contract.artifactPath) ? loadAbi(contract) : null,
  };

  check(`${contract.name} artifact`, abiHash.length > 0, contract.artifactPath);
  check(`${contract.name} address`, ethers.isAddress(address), address || "not configured");

  if (ethers.isAddress(address)) {
    try {
      const code = await provider.getCode(address);
      check(`${contract.name} bytecode`, code !== "0x", `${(code.length - 2) / 2} bytes`);
    } catch (error) {
      check(
        `${contract.name} bytecode`,
        false,
        error instanceof Error ? error.message : "lookup failed",
      );
    }
  }
}

const carPassAddress = resolved.CarPass?.address ?? "";

if (ethers.isAddress(carPassAddress) && ethers.isAddress(resolved.VehicleParts?.address ?? "")) {
  try {
    const vehicleParts = new ethers.Contract(
      resolved.VehicleParts.address,
      resolved.VehicleParts.abi,
      provider,
    );
    const linkedCarPass = await vehicleParts.carPass();
    check(
      "VehicleParts linked CarPass",
      linkedCarPass.toLowerCase() === carPassAddress.toLowerCase(),
      linkedCarPass,
    );
  } catch (error) {
    check(
      "VehicleParts linked CarPass",
      false,
      error instanceof Error ? error.message : "lookup failed",
    );
  }
}

if (ethers.isAddress(carPassAddress) && ethers.isAddress(resolved.CarPassOracle?.address ?? "")) {
  try {
    const oracle = new ethers.Contract(
      resolved.CarPassOracle.address,
      resolved.CarPassOracle.abi,
      provider,
    );
    const linkedCarPass = await oracle.carPass();
    check(
      "CarPassOracle linked CarPass",
      linkedCarPass.toLowerCase() === carPassAddress.toLowerCase(),
      linkedCarPass,
    );

    const deploymentOracle = resolved.CarPassOracle.deployment?.deployer ?? "";
    if (ethers.isAddress(deploymentOracle)) {
      const oracleRole = await oracle.ORACLE_ROLE();
      const hasOracleRole = await oracle.hasRole(oracleRole, deploymentOracle);
      check("CarPassOracle deployer ORACLE_ROLE", hasOracleRole, deploymentOracle);
    }
  } catch (error) {
    check(
      "CarPassOracle linked CarPass",
      false,
      error instanceof Error ? error.message : "lookup failed",
    );
  }
}

const registryPath = join(process.cwd(), "deployments", NETWORK, "registry.json");
if (!existsSync(registryPath)) {
  check("Deployment registry", false, "deployments/sepolia/registry.json missing");
} else {
  const registry = readJson(registryPath);
  check("Deployment registry", registry.network === NETWORK, registry.network ?? "network missing");

  for (const contract of contracts) {
    const entry = registry.contracts?.[contract.name];
    const hashOk = entry?.abiSha256 === resolved[contract.name]?.abiHash;
    check(
      `${contract.name} registry ABI hash`,
      hashOk,
      entry?.abiSha256 ? `${entry.abiSha256.slice(0, 12)}...` : "missing",
    );
  }
}

console.log("");
if (failed) {
  console.log("Sepolia health failed. Run compile/export/registry/deploy commands shown in docs/DEPLOY.md.");
  process.exitCode = 1;
} else {
  console.log("Sepolia health OK. Contracts, links and ABI registry are aligned.");
}
