import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const contractsDir = join(process.cwd(), "frontend", "src", "contracts");

const contracts = [
  {
    contractName: "CarPass",
    artifactPath: join(process.cwd(), "artifacts", "contracts", "CarPass.sol", "CarPass.json"),
    deploymentPath: join(process.cwd(), "deployments", "sepolia", "CarPass.json"),
    abiFile: "carpassAbi.ts",
    abiConst: "CARPASS_ABI",
    deploymentFile: "carpassDeployment.ts",
    deploymentConst: "CARPASS_DEPLOYMENT",
    envOverride: "VITE_CARPASS_CONTRACT_ADDRESS",
  },
  {
    contractName: "VehicleParts",
    artifactPath: join(process.cwd(), "artifacts", "contracts", "VehicleParts.sol", "VehicleParts.json"),
    deploymentPath: join(process.cwd(), "deployments", "sepolia", "VehicleParts.json"),
    abiFile: "vehiclePartsAbi.ts",
    abiConst: "VEHICLEPARTS_ABI",
    deploymentFile: "vehiclePartsDeployment.ts",
    deploymentConst: "VEHICLEPARTS_DEPLOYMENT",
    envOverride: "VITE_VEHICLEPARTS_CONTRACT_ADDRESS",
  },
];

await mkdir(contractsDir, { recursive: true });

for (const contract of contracts) {
  if (!existsSync(contract.artifactPath)) {
    throw new Error(`Missing ${contract.contractName} artifact. Run npm run compile with Node 22.13.0+ first.`);
  }

  const artifact = readJson(contract.artifactPath);
  const deployment = existsSync(contract.deploymentPath)
    ? readJson(contract.deploymentPath)
    : { address: "", network: "sepolia" };

  await writeFile(
    join(contractsDir, contract.abiFile),
    [
      `/* Auto-generated from artifacts/contracts/${contract.contractName}.sol/${contract.contractName}.json. */`,
      "/* Run `npm run export:frontend` after contract ABI changes. */",
      "",
      `export const ${contract.abiConst} = ${JSON.stringify(artifact.abi, null, 2)} as const`,
      "",
    ].join("\n"),
  );

  await writeFile(
    join(contractsDir, contract.deploymentFile),
    [
      `/* Auto-generated from deployments/sepolia/${contract.contractName}.json when available. */`,
      `/* ${contract.envOverride} can override this value locally. */`,
      "",
      `export const ${contract.deploymentConst} = {`,
      `  network: ${JSON.stringify(deployment.network ?? "sepolia")},`,
      `  address: ${JSON.stringify(deployment.address ?? "")},`,
      "} as const",
      "",
    ].join("\n"),
  );
}

console.log("Frontend contract artifacts exported to frontend/src/contracts");
