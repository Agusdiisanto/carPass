import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ethers } from "ethers";

const SEAL_NAMES = ["ACTIVO", "VENCIDO", "REVOCADO"];

const DEMO_EXPECTATIONS = [
  {
    vin: "1HGBH41JXMN109186",
    label: "Honda Civic 2022",
    seal: 0,
    reasonHint: "Sello valido",
  },
  {
    vin: "3FADP4EJ8FM123456",
    label: "Ford Focus 2020",
    seal: 1,
    reasonHint: "Sin VTV registrada",
  },
  {
    vin: "1G1BE5SM1H7123456",
    label: "Chevrolet Cruze 2019",
    seal: 1,
    reasonHint: "VTV con observaciones",
  },
  {
    vin: "2T1BURHE0JC043821",
    label: "Toyota Corolla 2021",
    seal: 2,
    reasonHint: "Siniestro grave",
  },
  {
    vin: "8A1FB1AB2JT123456",
    label: "Renault Logan 2018",
    seal: 2,
    reasonHint: "VTV rechazada",
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

function resolveContractAddress() {
  const envAddress =
    process.env.CARPASS_CONTRACT_ADDRESS ??
    process.env.VITE_CARPASS_CONTRACT_ADDRESS;
  if (envAddress && !isPlaceholder(envAddress)) return envAddress;

  const deploymentPath = join(process.cwd(), "deployments", "sepolia", "CarPass.json");
  if (existsSync(deploymentPath)) {
    const address = readJson(deploymentPath).address;
    if (address && !isPlaceholder(address)) return address;
  }

  throw new Error(
    "CarPass address not configured. Set CARPASS_CONTRACT_ADDRESS or run deploy:sepolia first.",
  );
}

function loadAbi() {
  const artifactPath = join(
    process.cwd(),
    "artifacts",
    "contracts",
    "CarPass.sol",
    "CarPass.json",
  );
  if (!existsSync(artifactPath)) {
    throw new Error("Missing CarPass artifact. Run npm run compile first.");
  }
  return readJson(artifactPath).abi;
}

function report(name, ok, detail) {
  console.log(`${ok ? "OK" : "FAIL"} ${name}: ${detail}`);
  return ok;
}

const rpcUrl = process.env.SEPOLIA_RPC_URL;
if (isPlaceholder(rpcUrl)) {
  console.log("FAIL SEPOLIA_RPC_URL: missing or placeholder");
  console.log("");
  console.log("Set SEPOLIA_RPC_URL in .env before running verify.");
  process.exitCode = 1;
  process.exit();
}

let contractAddress;
try {
  contractAddress = resolveContractAddress();
} catch (error) {
  console.log(`FAIL Contract address: ${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
  process.exit();
}

let abi;
try {
  abi = loadAbi();
} catch (error) {
  console.log(`FAIL CarPass artifact: ${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
  process.exit();
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const carPass = new ethers.Contract(contractAddress, abi, provider);

let failed = false;

failed ||= !report("Contract address", ethers.isAddress(contractAddress), contractAddress);

try {
  const network = await provider.getNetwork();
  failed ||= !report("Sepolia chain id", network.chainId === 11155111n, network.chainId.toString());
} catch (error) {
  failed ||= !report(
    "Sepolia RPC connection",
    false,
    error instanceof Error ? error.message : "connection failed",
  );
}

if (!failed) {
  try {
    const code = await provider.getCode(contractAddress);
    failed ||= !report("Contract bytecode", code !== "0x", `${(code.length - 2) / 2} bytes`);
  } catch (error) {
    failed ||= !report(
      "Contract bytecode",
      false,
      error instanceof Error ? error.message : "lookup failed",
    );
  }
}

console.log("");
console.log("Demo VIN checks:");

for (const demo of DEMO_EXPECTATIONS) {
  const prefix = `${demo.vin} (${demo.label})`;

  try {
    const tokenId = await carPass.vinToTokenId(demo.vin);
    const [vinOnChain] = await carPass.getVehiculoInfo(tokenId);
    const registered = vinOnChain === demo.vin;

    if (!registered) {
      failed ||= !report(prefix, false, "vehicle not registered on-chain");
      continue;
    }

    const [estado, motivo] = await carPass.getSelloCalidad(tokenId);
    const sealOk = Number(estado) === demo.seal;
    const reasonOk = String(motivo).toLowerCase().includes(demo.reasonHint.toLowerCase());
    const ok = sealOk && reasonOk;

    const detail = ok
      ? `${SEAL_NAMES[demo.seal]} — ${motivo}`
      : `expected ${SEAL_NAMES[demo.seal]} (${demo.reasonHint}), got ${SEAL_NAMES[Number(estado)] ?? estado} — ${motivo}`;

    failed ||= !report(prefix, ok, detail);
  } catch (error) {
    failed ||= !report(
      prefix,
      false,
      error instanceof Error ? error.message : "read failed",
    );
  }
}

console.log("");
if (failed) {
  console.log("Deployment verification failed.");
  console.log("If VINs are missing, run: npm run seed:sepolia");
  console.log("If address is stale, run: npm run deploy:sepolia && npm run export:frontend");
  process.exitCode = 1;
} else {
  console.log("Deployment verification OK. Contract and demo data match expectations.");
}
