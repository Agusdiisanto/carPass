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

const GRABADO_PREFIXES = ["MOT", "CAJ", "PDI", "PDD", "CAP", "BAU"];

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

function resolveAddress(envKeys, deploymentFile, field = "address") {
  for (const key of envKeys) {
    const envAddress = process.env[key];
    if (envAddress && !isPlaceholder(envAddress)) return envAddress;
  }

  const deploymentPath = join(process.cwd(), "deployments", "sepolia", deploymentFile);
  if (existsSync(deploymentPath)) {
    const value = readJson(deploymentPath)[field];
    if (value && !isPlaceholder(value)) return value;
  }

  return "";
}

function loadAbi(contractPath) {
  const artifactPath = join(process.cwd(), "artifacts", "contracts", contractPath);
  if (!existsSync(artifactPath)) {
    throw new Error(`Missing artifact at ${artifactPath}. Run npm run compile first.`);
  }
  return readJson(artifactPath).abi;
}

function report(name, ok, detail) {
  console.log(`${ok ? "OK" : "FAIL"} ${name}: ${detail}`);
  return ok;
}

function partesYaRegistradas(partes) {
  return partes.some((parte) => String(parte.numeroGrabado ?? "").trim().length > 0);
}

function demoNumerosGrabado(vin) {
  const suffix = vin.slice(-6).toUpperCase();
  return GRABADO_PREFIXES.map((prefix, index) => `${prefix}-${suffix}-${index + 1}`);
}

const rpcUrl = process.env.SEPOLIA_RPC_URL;
if (isPlaceholder(rpcUrl)) {
  console.log("FAIL SEPOLIA_RPC_URL: missing or placeholder");
  process.exitCode = 1;
  process.exit();
}

let carPassAddress;
let vehiclePartsAddress;
try {
  carPassAddress = resolveAddress(
    ["CARPASS_CONTRACT_ADDRESS", "VITE_CARPASS_CONTRACT_ADDRESS"],
    "CarPass.json",
  );
  vehiclePartsAddress = resolveAddress(
    ["VEHICLEPARTS_CONTRACT_ADDRESS", "VITE_VEHICLEPARTS_CONTRACT_ADDRESS"],
    "VehicleParts.json",
  );
  if (!ethers.isAddress(carPassAddress)) {
    throw new Error("CarPass address missing or invalid");
  }
} catch (error) {
  console.log(`FAIL Contract address: ${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
  process.exit();
}

let carPassAbi;
let vehiclePartsAbi = null;
try {
  carPassAbi = loadAbi("CarPass.sol/CarPass.json");
  if (vehiclePartsAddress && ethers.isAddress(vehiclePartsAddress)) {
    vehiclePartsAbi = loadAbi("VehicleParts.sol/VehicleParts.json");
  }
} catch (error) {
  console.log(`FAIL Artifacts: ${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
  process.exit();
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const carPass = new ethers.Contract(carPassAddress, carPassAbi, provider);
const vehicleParts =
  vehiclePartsAbi && vehiclePartsAddress
    ? new ethers.Contract(vehiclePartsAddress, vehiclePartsAbi, provider)
    : null;

let failed = false;

failed ||= !report("CarPass address", ethers.isAddress(carPassAddress), carPassAddress);

if (vehicleParts) {
  failed ||= !report("VehicleParts address", ethers.isAddress(vehiclePartsAddress), vehiclePartsAddress);
} else {
  failed ||= !report("VehicleParts address", false, "not configured");
}

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
    const code = await provider.getCode(carPassAddress);
    failed ||= !report("CarPass bytecode", code !== "0x", `${(code.length - 2) / 2} bytes`);
  } catch (error) {
    failed ||= !report(
      "CarPass bytecode",
      false,
      error instanceof Error ? error.message : "lookup failed",
    );
  }
}

if (vehicleParts && !failed) {
  try {
    const code = await provider.getCode(vehiclePartsAddress);
    failed ||= !report("VehicleParts bytecode", code !== "0x", `${(code.length - 2) / 2} bytes`);
    const linkedCarPass = await vehicleParts.carPass();
    failed ||= !report(
      "VehicleParts linked CarPass",
      linkedCarPass.toLowerCase() === carPassAddress.toLowerCase(),
      linkedCarPass,
    );
  } catch (error) {
    failed ||= !report(
      "VehicleParts bytecode",
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

    failed ||= !report(`${prefix} · sello`, ok, detail);

    if (vehicleParts) {
      const partes = await vehicleParts.getPartesVehiculo(tokenId);
      const partsOk = partesYaRegistradas(partes);
      const expectedMotor = demoNumerosGrabado(demo.vin)[0];
      const motorOk = partsOk && partes[0]?.numeroGrabado === expectedMotor;
      failed ||= !report(
        `${prefix} · autopartes`,
        motorOk,
        partsOk ? `motor ${partes[0]?.numeroGrabado}` : "6 autopartes pendientes — correr npm run seed:sepolia",
      );
    }
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
  console.log("If VINs or autopartes faltan: npm run seed:sepolia");
  console.log("Si cambio la address: npm run export:frontend");
  process.exitCode = 1;
} else {
  console.log("Deployment verification OK. CarPass, VehicleParts and demo data match expectations.");
}
