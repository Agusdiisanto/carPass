import "dotenv/config";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ethers } from "ethers";

const requiredNode = [22, 13, 0];

function parseNode(version) {
  return version.replace(/^v/, "").split(".").map((part) => Number(part));
}

function isAtLeast(current, required) {
  for (let i = 0; i < required.length; i++) {
    if ((current[i] ?? 0) > required[i]) return true;
    if ((current[i] ?? 0) < required[i]) return false;
  }
  return true;
}

function isPlaceholder(value) {
  return (
    value === undefined ||
    value.trim() === "" ||
    /YOUR_PROJECT_ID|your_private_key|optional/i.test(value)
  );
}

const checks = [];
const nodeVersion = parseNode(process.version);
checks.push({
  name: "Node 22.13.0+",
  ok: isAtLeast(nodeVersion, requiredNode),
  detail: process.version,
});

const artifactPath = join(
  process.cwd(),
  "artifacts",
  "contracts",
  "CarPass.sol",
  "CarPass.json",
);
checks.push({
  name: "CarPass artifact",
  ok: existsSync(artifactPath),
  detail: artifactPath,
});

const rpcUrl = process.env.SEPOLIA_RPC_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
checks.push({
  name: "SEPOLIA_RPC_URL",
  ok: !isPlaceholder(rpcUrl),
  detail: isPlaceholder(rpcUrl) ? "missing or placeholder" : "configured",
});
checks.push({
  name: "DEPLOYER_PRIVATE_KEY",
  ok: !isPlaceholder(privateKey),
  detail: isPlaceholder(privateKey) ? "missing or placeholder" : "configured",
});

let deployerAddress = "";
if (!isPlaceholder(privateKey)) {
  try {
    deployerAddress = new ethers.Wallet(privateKey).address;
    checks.push({ name: "Deployer address", ok: true, detail: deployerAddress });
  } catch {
    checks.push({ name: "Deployer address", ok: false, detail: "invalid private key" });
  }
}

if (!isPlaceholder(rpcUrl) && deployerAddress !== "") {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(deployerAddress);
    checks.push({
      name: "Sepolia chain id",
      ok: network.chainId === 11155111n,
      detail: network.chainId.toString(),
    });
    checks.push({
      name: "Deployer balance",
      ok: balance > 0n,
      detail: `${ethers.formatEther(balance)} ETH`,
    });
  } catch (error) {
    checks.push({
      name: "Sepolia RPC connection",
      ok: false,
      detail: error instanceof Error ? error.message : "connection failed",
    });
  }
}

let failed = false;
for (const check of checks) {
  const mark = check.ok ? "OK" : "FAIL";
  console.log(`${mark} ${check.name}: ${check.detail}`);
  failed ||= !check.ok;
}

if (failed) {
  console.log("");
  console.log("Deploy is not ready. Fill .env and run npm run compile before deploy.");
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Deploy readiness OK. Next: npm run deploy:sepolia");
}
