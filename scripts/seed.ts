import { network } from "hardhat";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { demoNumerosGrabado, partesYaRegistradas } from "./lib/demoParts.ts";

const { ethers } = await network.create();

type DemoVehicle = {
  vin: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
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

const carPassAddress = resolveContractAddress(
  ["CARPASS_CONTRACT_ADDRESS", "VITE_CARPASS_CONTRACT_ADDRESS"],
  "CarPass.json",
);
if (!ethers.isAddress(carPassAddress)) {
  throw new Error(
    "CarPass address not configured. Set CARPASS_CONTRACT_ADDRESS or run deploy:sepolia first.",
  );
}

const vehiclePartsAddress = resolveContractAddress(
  ["VEHICLEPARTS_CONTRACT_ADDRESS", "VITE_VEHICLEPARTS_CONTRACT_ADDRESS"],
  "VehicleParts.json",
);

const carPassArtifact = readJson(
  join(process.cwd(), "artifacts", "contracts", "CarPass.sol", "CarPass.json"),
);
const vehiclePartsArtifact = existsSync(
  join(process.cwd(), "artifacts", "contracts", "VehicleParts.sol", "VehicleParts.json"),
)
  ? readJson(
      join(process.cwd(), "artifacts", "contracts", "VehicleParts.sol", "VehicleParts.json"),
    )
  : null;

const [deployer] = await ethers.getSigners();
const carPass = new ethers.Contract(carPassAddress, carPassArtifact.abi, deployer);
const vehicleParts =
  vehiclePartsArtifact && ethers.isAddress(vehiclePartsAddress)
    ? new ethers.Contract(vehiclePartsAddress, vehiclePartsArtifact.abi, deployer)
    : null;

const now = Math.floor(Date.now() / 1000);
const oneYear = 365 * 24 * 60 * 60;
const zero = "0x0000000000000000000000000000000000000000";

async function grantSeedRoles() {
  const roles = await Promise.all([
    carPass.REGISTRADOR_ROLE(),
    carPass.MECANICO_ROLE(),
    carPass.INSPECTOR_VTV_ROLE(),
    carPass.ASEGURADORA_ROLE(),
  ]);

  for (const role of roles) {
    if (!(await carPass.hasRole(role, deployer.address))) {
      await (await carPass.grantRole(role, deployer.address)).wait();
      console.log("Granted seed role:", role);
    }
  }
}

async function registrar(vehicle: DemoVehicle) {
  const tokenId = await carPass.vinToTokenId(vehicle.vin);
  const [existingVin] = await carPass.getVehiculoInfo(tokenId);
  if (existingVin === vehicle.vin) {
    console.log("Vehicle already seeded:", vehicle.vin);
    return tokenId;
  }

  await (await carPass.registrarVehiculo(vehicle, deployer.address)).wait();
  console.log("Vehicle seeded:", vehicle.vin);
  return tokenId;
}

async function seedPartes(tokenId: bigint, vin: string) {
  if (!vehicleParts) {
    console.log("VehicleParts not configured, skipping parts for:", vin);
    return;
  }

  const partes = await vehicleParts.getPartesVehiculo(tokenId);
  if (partesYaRegistradas(partes)) {
    console.log("Parts already seeded:", vin);
    return;
  }

  const numeros = demoNumerosGrabado(vin);
  await (await vehicleParts.registrarPartes(tokenId, numeros)).wait();
  console.log("Parts seeded:", vin, numeros.join(", "));
}

async function service(tokenId: bigint, km: number, tipo: string, descripcion: string) {
  const history = await carPass.getHistorialService(tokenId);
  const exists = history.some(
    (record: { kilometraje: bigint; tipoServicio: string }) =>
      record.kilometraje === BigInt(km) && record.tipoServicio === tipo,
  );
  if (exists) {
    console.log("Service already seeded:", tokenId.toString(), km, tipo);
    return;
  }

  const lastKm = await carPass.ultimoKilometrajeRegistrado(tokenId);
  if (lastKm >= BigInt(km)) {
    console.log("Service skipped by mileage guard:", tokenId.toString(), km, "last", lastKm.toString());
    return;
  }

  await (
    await carPass.agregarService(tokenId, {
      timestamp: 0,
      tipoServicio: tipo,
      kilometraje: km,
      taller: zero,
      descripcion,
    })
  ).wait();
  console.log("Service seeded:", tokenId.toString(), km, tipo);
}

async function vtv(tokenId: bigint, resultado: number, vencimiento: number) {
  const history = await carPass.getHistorialVTV(tokenId);
  const exists = history.some(
    (record: { resultado: bigint; vencimiento: bigint }) =>
      record.resultado === BigInt(resultado) &&
      (record.vencimiento === BigInt(vencimiento) ||
        (vencimiento > now && record.vencimiento > BigInt(now))),
  );
  if (exists) {
    console.log("VTV already seeded:", tokenId.toString(), resultado, vencimiento);
    return;
  }

  await (
    await carPass.agregarVTV(tokenId, {
      timestamp: 0,
      resultado,
      vencimiento,
      planta: zero,
    })
  ).wait();
  console.log("VTV seeded:", tokenId.toString(), resultado, vencimiento);
}

async function siniestro(
  tokenId: bigint,
  gravedad: number,
  descripcion: string,
  reparado: boolean,
  costoEstimado: number,
) {
  const history = await carPass.getHistorialSiniestros(tokenId);
  const exists = history.some(
    (record: {
      gravedad: bigint;
      descripcion: string;
      reparado: boolean;
      costoEstimado: bigint;
    }) =>
      record.gravedad === BigInt(gravedad) &&
      record.descripcion === descripcion &&
      record.reparado === reparado &&
      record.costoEstimado === BigInt(costoEstimado),
  );
  if (exists) {
    console.log("Siniestro already seeded:", tokenId.toString(), gravedad, descripcion);
    return;
  }

  await (
    await carPass.agregarSiniestro(tokenId, {
      timestamp: 0,
      gravedad,
      descripcion,
      reparado,
      costoEstimado,
      declarante: zero,
    })
  ).wait();
  console.log("Siniestro seeded:", tokenId.toString(), gravedad, descripcion);
}

console.log("Seeding CarPass demo data");
console.log("Deployer:", deployer.address);
console.log("CarPass:", carPassAddress);
console.log("VehicleParts:", vehiclePartsAddress || "(not configured)");
console.log("Network:", (await ethers.provider.getNetwork()).name);

await grantSeedRoles();
console.log("Seed roles ready.");

const civic = await registrar({
  vin: "1HGBH41JXMN109186",
  marca: "Honda",
  modelo: "Civic",
  anio: 2022,
  color: "Gris",
});
await seedPartes(civic, "1HGBH41JXMN109186");
await service(civic, 10000, "Service 10.000 km", "Cambio de aceite y filtros");
await service(civic, 20000, "Service 20.000 km", "Cambio de aceite, filtros y bujias");
await service(civic, 30000, "Service 30.000 km", "Service mayor: frenos, suspension y liquidos");
await vtv(civic, 0, now + oneYear);

const focus = await registrar({
  vin: "3FADP4EJ8FM123456",
  marca: "Ford",
  modelo: "Focus",
  anio: 2020,
  color: "Rojo",
});
await seedPartes(focus, "3FADP4EJ8FM123456");
await service(focus, 15000, "Service 15.000 km", "Cambio de aceite");
await service(focus, 30000, "Service 30.000 km", "Service completo");

const cruze = await registrar({
  vin: "1G1BE5SM1H7123456",
  marca: "Chevrolet",
  modelo: "Cruze",
  anio: 2019,
  color: "Blanco",
});
await seedPartes(cruze, "1G1BE5SM1H7123456");
await service(cruze, 25000, "Service 25.000 km", "Cambio de aceite y filtros");
await vtv(cruze, 1, now + oneYear);

const corolla = await registrar({
  vin: "2T1BURHE0JC043821",
  marca: "Toyota",
  modelo: "Corolla",
  anio: 2021,
  color: "Negro",
});
await seedPartes(corolla, "2T1BURHE0JC043821");
await service(corolla, 10000, "Service 10.000 km", "Cambio de aceite");
await vtv(corolla, 0, now + oneYear);
await siniestro(
  corolla,
  2,
  "Choque frontal a alta velocidad. Airbags desplegados. Dano estructural en tren delantero.",
  false,
  800000,
);

const logan = await registrar({
  vin: "8A1FB1AB2JT123456",
  marca: "Renault",
  modelo: "Logan",
  anio: 2018,
  color: "Azul",
});
await seedPartes(logan, "8A1FB1AB2JT123456");
await service(logan, 40000, "Service 40.000 km", "Cambio de aceite y revision general");
await vtv(logan, 2, 0);

console.log("");
console.log("Seed complete. Demo VINs:");
console.log("1HGBH41JXMN109186  Honda Civic 2022       -> ACTIVO + 6 autopartes");
console.log("3FADP4EJ8FM123456  Ford Focus 2020        -> VENCIDO (sin VTV) + 6 autopartes");
console.log("1G1BE5SM1H7123456  Chevrolet Cruze 2019   -> VENCIDO (VTV con observaciones) + 6 autopartes");
console.log("2T1BURHE0JC043821  Toyota Corolla 2021    -> REVOCADO (siniestro grave) + 6 autopartes");
console.log("8A1FB1AB2JT123456  Renault Logan 2018     -> REVOCADO (VTV rechazada) + 6 autopartes");
