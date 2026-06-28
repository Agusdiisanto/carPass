import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const artifactPath = join(
  process.cwd(),
  "artifacts",
  "contracts",
  "CarPass.sol",
  "CarPass.json",
);
const contractsDir = join(process.cwd(), "frontend", "src", "contracts");
const deploymentPath = join(process.cwd(), "deployments", "sepolia", "CarPass.json");

if (!existsSync(artifactPath)) {
  throw new Error("Missing CarPass artifact. Run npm run compile with Node 22.13.0+ first.");
}

const artifact = readJson(artifactPath);
const deployment = existsSync(deploymentPath)
  ? readJson(deploymentPath)
  : { address: "", network: "sepolia" };

await mkdir(contractsDir, { recursive: true });

await writeFile(
  join(contractsDir, "carpassAbi.ts"),
  [
    "/* Auto-generated from artifacts/contracts/CarPass.sol/CarPass.json. */",
    "/* Run `npm run export:frontend` after contract ABI changes. */",
    "",
    `export const CARPASS_ABI = ${JSON.stringify(artifact.abi, null, 2)} as const`,
    "",
  ].join("\n"),
);

await writeFile(
  join(contractsDir, "carpassDeployment.ts"),
  [
    "/* Auto-generated from deployments/sepolia/CarPass.json when available. */",
    "/* VITE_CARPASS_CONTRACT_ADDRESS can override this value locally. */",
    "",
    "export const CARPASS_DEPLOYMENT = {",
    `  network: ${JSON.stringify(deployment.network ?? "sepolia")},`,
    `  address: ${JSON.stringify(deployment.address ?? "")},`,
    "} as const",
    "",
  ].join("\n"),
);

console.log("Frontend contract artifacts exported to frontend/src/contracts");
