import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ethers } from "ethers";

const FALLBACK_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const SNAPSHOT_PATH = join(process.cwd(), "frontend", "src", "data", "publicVehicleSnapshot.json");

const DEFENSE_VINS = [
  "1HGBH41JXMN109186",
  "3FADP4EJ8FM123456",
  "1G1BE5SM1H7123456",
  "2T1BURHE0JC043821",
  "8A1FB1AB2JT123456",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isPlaceholder(value) {
  return (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    /YOUR_PROJECT_ID|your_private_key|optional/i.test(String(value))
  );
}

function resolveContractAddress() {
  const envAddress =
    process.env.CARPASS_CONTRACT_ADDRESS ??
    process.env.VITE_CARPASS_CONTRACT_ADDRESS;
  if (!isPlaceholder(envAddress)) return envAddress;

  const deploymentPath = join(process.cwd(), "deployments", "sepolia", "CarPass.json");
  if (existsSync(deploymentPath)) {
    const address = readJson(deploymentPath).address;
    if (!isPlaceholder(address)) return address;
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

function toNumber(value) {
  return Number(value ?? 0);
}

function serviceToSnapshot(record) {
  return {
    timestamp: record.timestamp.toString(),
    tipoServicio: record.tipoServicio,
    kilometraje: record.kilometraje.toString(),
    taller: record.taller,
    descripcion: record.descripcion,
  };
}

function siniestroToSnapshot(record) {
  return {
    timestamp: record.timestamp.toString(),
    gravedad: toNumber(record.gravedad),
    descripcion: record.descripcion,
    reparado: record.reparado,
    costoEstimado: record.costoEstimado.toString(),
    declarante: record.declarante,
  };
}

function vtvToSnapshot(record) {
  return {
    timestamp: record.timestamp.toString(),
    resultado: toNumber(record.resultado),
    vencimiento: record.vencimiento.toString(),
    planta: record.planta,
  };
}

function vehicleInfoToSnapshot(info) {
  return {
    vin: info.vin,
    marca: info.marca,
    modelo: info.modelo,
    anio: toNumber(info.anio),
    color: info.color,
  };
}

const contractAddress = resolveContractAddress();
if (!ethers.isAddress(contractAddress)) {
  throw new Error(`Invalid CarPass address: ${contractAddress}`);
}

const rpcUrl = isPlaceholder(process.env.SEPOLIA_RPC_URL)
  ? FALLBACK_SEPOLIA_RPC
  : process.env.SEPOLIA_RPC_URL;
const abi = loadAbi();
const provider = new ethers.JsonRpcProvider(rpcUrl);
const carPass = new ethers.Contract(contractAddress, abi, provider);

console.log("Syncing CarPass public snapshot");
console.log("Contract:", contractAddress);
console.log("RPC:", new URL(rpcUrl).hostname);

const [network, blockNumber] = await Promise.all([
  provider.getNetwork(),
  provider.getBlockNumber(),
]);

const snapshot = {
  schemaVersion: 1,
  network: network.name === "unknown" ? "sepolia" : network.name,
  chainId: Number(network.chainId),
  contractAddress,
  syncedAt: new Date().toISOString(),
  blockNumber,
  source: "sepolia",
  vehicles: {},
};

for (const vin of DEFENSE_VINS) {
  const tokenId = await carPass.vinToTokenId(vin);
  const info = await carPass.getVehiculoInfo(tokenId);

  if (info.vin !== vin) {
    console.log("SKIP", vin, "not registered on-chain");
    continue;
  }

  const [services, siniestros, vtv, sello, ownerAddress] = await Promise.all([
    carPass.getHistorialService(tokenId),
    carPass.getHistorialSiniestros(tokenId),
    carPass.getHistorialVTV(tokenId),
    carPass.getSelloCalidad(tokenId),
    carPass.ownerOf(tokenId),
  ]);

  snapshot.vehicles[vin] = {
    tokenId: tokenId.toString(),
    info: vehicleInfoToSnapshot(info),
    services: services.map(serviceToSnapshot),
    siniestros: siniestros.map(siniestroToSnapshot),
    vtv: vtv.map(vtvToSnapshot),
    sello: {
      estado: toNumber(sello[0]),
      motivo: sello[1],
    },
    ownerAddress,
  };

  console.log("OK", vin, info.marca, info.modelo);
}

await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log("");
console.log(`Public snapshot written to ${SNAPSHOT_PATH}`);
console.log(`Vehicles exported: ${Object.keys(snapshot.vehicles).length}/${DEFENSE_VINS.length}`);
