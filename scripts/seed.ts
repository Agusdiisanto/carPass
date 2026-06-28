import { network } from "hardhat";

const { ethers } = await network.create();

const CONTRACT_ADDRESS = "0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D";

const ABI = [
  "function MECANICO_ROLE() view returns (bytes32)",
  "function INSPECTOR_VTV_ROLE() view returns (bytes32)",
  "function ASEGURADORA_ROLE() view returns (bytes32)",
  "function grantRole(bytes32 role, address account)",
  "function registrarVehiculo((string vin,string marca,string modelo,uint16 anio,string color) info, address propietarioInicial) returns (uint256)",
  "function vinToTokenId(string vin) view returns (uint256)",
  "function agregarService(uint256 tokenId,(uint256 timestamp,string tipoServicio,uint32 kilometraje,address taller,string descripcion) registro)",
  "function agregarSiniestro(uint256 tokenId,(uint256 timestamp,uint8 gravedad,string descripcion,bool reparado,uint256 costoEstimado,address declarante) registro)",
  "function agregarVTV(uint256 tokenId,(uint256 timestamp,uint8 resultado,uint256 vencimiento,address planta) registro)",
];

const [deployer] = await ethers.getSigners();
console.log("Seeding CarPass desde:", deployer.address);

const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, deployer);

// Otorgar todos los roles al deployer para el seed
console.log("\nAsignando roles al deployer...");
const [mecRole, vtvRole, asegRole] = await Promise.all([
  contract.MECANICO_ROLE(),
  contract.INSPECTOR_VTV_ROLE(),
  contract.ASEGURADORA_ROLE(),
]);
await (await contract.grantRole(mecRole, deployer.address)).wait();
await (await contract.grantRole(vtvRole, deployer.address)).wait();
await (await contract.grantRole(asegRole, deployer.address)).wait();
console.log("Roles asignados.");

const now = Math.floor(Date.now() / 1000);
const oneYear = 365 * 24 * 60 * 60;
const zero = "0x0000000000000000000000000000000000000000";

// ─────────────────────────────────────────────────────────────────────────────
// Vehiculo 1 — Sello ACTIVO
// Honda Civic con service reciente y VTV aprobada vigente
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1/5] Honda Civic 2022 — sello ACTIVO...");
await (await contract.registrarVehiculo(
  { vin: "1HGBH41JXMN109186", marca: "Honda", modelo: "Civic", anio: 2022, color: "Gris" },
  deployer.address,
)).wait();
const tid1 = await contract.vinToTokenId("1HGBH41JXMN109186");
await (await contract.agregarService(tid1, { timestamp: 0, tipoServicio: "Service 10.000 km", kilometraje: 10000, taller: zero, descripcion: "Cambio de aceite y filtros" })).wait();
await (await contract.agregarService(tid1, { timestamp: 0, tipoServicio: "Service 20.000 km", kilometraje: 20000, taller: zero, descripcion: "Cambio de aceite, filtros y bujias" })).wait();
await (await contract.agregarService(tid1, { timestamp: 0, tipoServicio: "Service 30.000 km", kilometraje: 30000, taller: zero, descripcion: "Service mayor: frenos, suspension y liquidos" })).wait();
await (await contract.agregarVTV(tid1, { timestamp: 0, resultado: 0, vencimiento: now + oneYear, planta: zero })).wait();
console.log("  VIN: 1HGBH41JXMN109186 — 3 services, VTV aprobada vigente → ACTIVO");

// ─────────────────────────────────────────────────────────────────────────────
// Vehiculo 2 — Sello VENCIDO por sin VTV
// Ford Focus con services pero nunca fue a VTV
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2/5] Ford Focus 2020 — sello VENCIDO (sin VTV)...");
await (await contract.registrarVehiculo(
  { vin: "3FADP4EJ8FM123456", marca: "Ford", modelo: "Focus", anio: 2020, color: "Rojo" },
  deployer.address,
)).wait();
const tid2 = await contract.vinToTokenId("3FADP4EJ8FM123456");
await (await contract.agregarService(tid2, { timestamp: 0, tipoServicio: "Service 15.000 km", kilometraje: 15000, taller: zero, descripcion: "Cambio de aceite" })).wait();
await (await contract.agregarService(tid2, { timestamp: 0, tipoServicio: "Service 30.000 km", kilometraje: 30000, taller: zero, descripcion: "Service completo" })).wait();
console.log("  VIN: 3FADP4EJ8FM123456 — 2 services, sin VTV → VENCIDO");

// ─────────────────────────────────────────────────────────────────────────────
// Vehiculo 3 — Sello VENCIDO por VTV con observaciones
// Chevrolet Cruze con VTV aprobada pero con observaciones
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3/5] Chevrolet Cruze 2019 — sello VENCIDO (VTV con observaciones)...");
await (await contract.registrarVehiculo(
  { vin: "1G1BE5SM1H7123456", marca: "Chevrolet", modelo: "Cruze", anio: 2019, color: "Blanco" },
  deployer.address,
)).wait();
const tid3 = await contract.vinToTokenId("1G1BE5SM1H7123456");
await (await contract.agregarService(tid3, { timestamp: 0, tipoServicio: "Service 25.000 km", kilometraje: 25000, taller: zero, descripcion: "Cambio de aceite y filtros" })).wait();
await (await contract.agregarVTV(tid3, { timestamp: 0, resultado: 1, vencimiento: now + oneYear, planta: zero })).wait();
console.log("  VIN: 1G1BE5SM1H7123456 — service + VTV con observaciones → VENCIDO");

// ─────────────────────────────────────────────────────────────────────────────
// Vehiculo 4 — Sello REVOCADO por siniestro grave sin reparar
// Toyota Corolla con choque frontal grave no reparado
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4/5] Toyota Corolla 2021 — sello REVOCADO (siniestro grave)...");
await (await contract.registrarVehiculo(
  { vin: "2T1BURHE0JC043821", marca: "Toyota", modelo: "Corolla", anio: 2021, color: "Negro" },
  deployer.address,
)).wait();
const tid4 = await contract.vinToTokenId("2T1BURHE0JC043821");
await (await contract.agregarService(tid4, { timestamp: 0, tipoServicio: "Service 10.000 km", kilometraje: 10000, taller: zero, descripcion: "Cambio de aceite" })).wait();
await (await contract.agregarVTV(tid4, { timestamp: 0, resultado: 0, vencimiento: now + oneYear, planta: zero })).wait();
await (await contract.agregarSiniestro(tid4, { timestamp: 0, gravedad: 2, descripcion: "Choque frontal a alta velocidad. Airbags desplegados. Daño estructural en tren delantero.", reparado: false, costoEstimado: 800000, declarante: zero })).wait();
console.log("  VIN: 2T1BURHE0JC043821 — siniestro GRAVE sin reparar → REVOCADO");

// ─────────────────────────────────────────────────────────────────────────────
// Vehiculo 5 — Sello REVOCADO por VTV rechazada
// Renault Logan que reprobó la VTV
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5/5] Renault Logan 2018 — sello REVOCADO (VTV rechazada)...");
await (await contract.registrarVehiculo(
  { vin: "8A1FB1AB2JT123456", marca: "Renault", modelo: "Logan", anio: 2018, color: "Azul" },
  deployer.address,
)).wait();
const tid5 = await contract.vinToTokenId("8A1FB1AB2JT123456");
await (await contract.agregarService(tid5, { timestamp: 0, tipoServicio: "Service 40.000 km", kilometraje: 40000, taller: zero, descripcion: "Cambio de aceite y revision general" })).wait();
await (await contract.agregarVTV(tid5, { timestamp: 0, resultado: 2, vencimiento: 0, planta: zero })).wait();
console.log("  VIN: 8A1FB1AB2JT123456 — VTV rechazada → REVOCADO");

// ─────────────────────────────────────────────────────────────────────────────
// Resumen
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n─────────────────────────────────────────");
console.log("Seed completado. VINs para probar:");
console.log("  1HGBH41JXMN109186  Honda Civic 2022       → ACTIVO");
console.log("  3FADP4EJ8FM123456  Ford Focus 2020        → VENCIDO (sin VTV)");
console.log("  1G1BE5SM1H7123456  Chevrolet Cruze 2019   → VENCIDO (VTV con obs.)");
console.log("  2T1BURHE0JC043821  Toyota Corolla 2021    → REVOCADO (siniestro grave)");
console.log("  8A1FB1AB2JT123456  Renault Logan 2018     → REVOCADO (VTV rechazada)");
console.log("─────────────────────────────────────────");
