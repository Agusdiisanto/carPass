import { network } from "hardhat";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const { ethers } = await network.create();

type DemoOracleEvidence = {
  vin: string;
  kind: number;
  externalId: string;
  payload: string;
  validUntil: number;
};

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isPlaceholder(value: string | undefined) {
  return value === undefined || value.trim() === "";
}

function resolveContractAddress(envKeys: string[], deploymentFile: string) {
  for (const key of envKeys) {
    const envAddress = process.env[key];
    if (envAddress && !isPlaceholder(envAddress)) return envAddress;
  }

  const deploymentPath = join(process.cwd(), "deployments", "sepolia", deploymentFile);
  if (existsSync(deploymentPath)) {
    return readJson(deploymentPath).address as string;
  }

  return "";
}

function hashText(value: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

// Mismo algoritmo que _merkleRoot en CarPassOracle.sol: par ordenado + keccak256
// conmutativo por nivel, promoviendo sin hashear el nodo impar. Debe quedar en sync
// con el contrato para poder predecir el root y generar proofs validas para verifyEvidenceLeaf.
function hashPair(a: string, b: string) {
  const [left, right] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([left, right]));
}

function nextLevel(level: string[]) {
  const next: string[] = [];
  for (let i = 0; i < level.length; i += 2) {
    next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
  }
  return next;
}

function merkleRoot(leaves: string[]) {
  if (leaves.length === 0) return ethers.ZeroHash;
  let level = leaves;
  while (level.length > 1) {
    level = nextLevel(level);
  }
  return level[0];
}

function merkleProof(leaves: string[], leafIndex: number) {
  const proof: string[] = [];
  let level = leaves;
  let index = leafIndex;
  while (level.length > 1) {
    const pairIndex = index % 2 === 0 ? index + 1 : index - 1;
    if (pairIndex < level.length) {
      proof.push(level[pairIndex]);
    }
    level = nextLevel(level);
    index = Math.floor(index / 2);
  }
  return proof;
}

const carPassAddress = resolveContractAddress(
  ["CARPASS_CONTRACT_ADDRESS", "VITE_CARPASS_CONTRACT_ADDRESS"],
  "CarPass.json",
);
const oracleAddress = resolveContractAddress(
  ["CARPASS_ORACLE_CONTRACT_ADDRESS", "VITE_CARPASS_ORACLE_CONTRACT_ADDRESS"],
  "CarPassOracle.json",
);

if (!ethers.isAddress(carPassAddress)) {
  throw new Error("CarPass address not configured. Run deploy:sepolia or set CARPASS_CONTRACT_ADDRESS.");
}
if (!ethers.isAddress(oracleAddress)) {
  throw new Error("CarPassOracle address not configured. Run deploy:oracle:sepolia first.");
}

const carPassArtifact = readJson(
  join(process.cwd(), "artifacts", "contracts", "CarPass.sol", "CarPass.json"),
);
const oracleArtifact = readJson(
  join(process.cwd(), "artifacts", "contracts", "CarPassOracle.sol", "CarPassOracle.json"),
);

const [deployer] = await ethers.getSigners();
const carPass = new ethers.Contract(carPassAddress, carPassArtifact.abi, deployer);
const oracle = new ethers.Contract(oracleAddress, oracleArtifact.abi, deployer);
const now = Math.floor(Date.now() / 1000);
const oneYear = 365 * 24 * 60 * 60;

const evidence: DemoOracleEvidence[] = [
  {
    vin: "1HGBH41JXMN109186",
    kind: 0,
    externalId: "VTV-HONDA-CIVIC-2026-APROBADA",
    payload: "Planta VTV Demo certifica aprobacion vigente Honda Civic 2022",
    validUntil: now + oneYear,
  },
  {
    vin: "1HGBH41JXMN109186",
    kind: 4,
    externalId: "AUTOPARTES-HONDA-CIVIC-2026-GRABADAS",
    payload: "Proveedor Demo certifica 6 autopartes grabadas para Honda Civic 2022",
    validUntil: 0,
  },
  {
    vin: "1G1BE5SM1H7123456",
    kind: 0,
    externalId: "VTV-CRUZE-2026-OBSERVADA",
    payload: "Planta VTV Demo certifica VTV con observaciones para Chevrolet Cruze 2019",
    validUntil: now + oneYear,
  },
];

console.log("Seeding CarPassOracle demo evidence");
console.log("Deployer:", deployer.address);
console.log("CarPass:", carPassAddress);
console.log("CarPassOracle:", oracleAddress);

const oracleRole = await oracle.ORACLE_ROLE();
if (!(await oracle.hasRole(oracleRole, deployer.address))) {
  throw new Error(`Deployer ${deployer.address} does not have ORACLE_ROLE.`);
}

for (const item of evidence) {
  const tokenId = await carPass.vinToTokenId(item.vin);
  const externalIdHash = hashText(item.externalId);
  const existingId = await oracle.getAttestationId(tokenId, item.kind, externalIdHash);
  if (existingId !== ethers.ZeroHash) {
    console.log("Oracle attestation already seeded:", item.externalId);
    continue;
  }

  const payloadHash = hashText(item.payload);
  await (
    await oracle.submitAttestation(tokenId, item.kind, externalIdHash, payloadHash, item.validUntil)
  ).wait();
  console.log("Oracle attestation seeded:", item.externalId);
}

const civicTokenId = await carPass.vinToTokenId("1HGBH41JXMN109186");
const civicPartLabels = [
  "MOT-109186-1",
  "CAJ-109186-2",
  "PDI-109186-3",
  "PDD-109186-4",
  "CAP-109186-5",
  "BAU-109186-6",
];
const civicLeaves = civicPartLabels.map(hashText);
const civicMerkleRoot = merkleRoot(civicLeaves);
const civicBatchMetadataHash = hashText("Batch Merkle Demo: 6 autopartes grabadas Honda Civic 2022");
const existingBatchId = await oracle.getEvidenceBatchId(civicTokenId, 4, civicMerkleRoot);

let civicBatchId = existingBatchId;
if (existingBatchId === ethers.ZeroHash) {
  const tx = await oracle.submitEvidenceBatch(civicTokenId, 4, civicLeaves, civicBatchMetadataHash);
  await tx.wait();
  civicBatchId = await oracle.getEvidenceBatchId(civicTokenId, 4, civicMerkleRoot);
  console.log("Oracle Merkle batch seeded: Honda Civic autopartes");
  console.log("Merkle root:", civicMerkleRoot);
} else {
  console.log("Oracle Merkle batch already seeded: Honda Civic autopartes");
}

const sampleProof = merkleProof(civicLeaves, 0);
const verified = await oracle.verifyEvidenceLeaf(civicBatchId, civicLeaves[0], sampleProof);
console.log(
  `On-chain verification for leaf "${civicPartLabels[0]}" against published batch:`,
  verified ? "OK" : "FAILED",
);
if (!verified) {
  throw new Error("verifyEvidenceLeaf did not confirm the seeded leaf against its own batch root.");
}

console.log("Oracle seed complete.");
