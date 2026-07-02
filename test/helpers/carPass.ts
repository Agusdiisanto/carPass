import assert from "node:assert/strict";
import { network } from "hardhat";
import { expectCustomError } from "./contracts.js";

export { expectCustomError };

export const { ethers } = await network.create();

export type CarPassContract = Awaited<ReturnType<typeof ethers.deployContract>>;

export const ZERO = ethers.ZeroAddress;
export const YEAR = 365 * 24 * 60 * 60;

export function vehicleInfo(vin: string, marca = "Toyota", modelo = "Corolla") {
  return {
    vin,
    marca,
    modelo,
    anio: 2024,
    color: "Blanco",
  };
}

export function serviceRecord(kilometraje: number, tipoServicio = "Service oficial") {
  return {
    timestamp: 0,
    tipoServicio,
    kilometraje,
    taller: ZERO,
    descripcion: "Cambio de aceite y control general",
  };
}

export function vtvRecord(resultado: number, vencimiento: number) {
  return {
    timestamp: 0,
    resultado,
    vencimiento,
    planta: ZERO,
  };
}

export function siniestroRecord(gravedad: number, reparado: boolean) {
  return {
    timestamp: 0,
    gravedad,
    descripcion: "Choque frontal con dano estructural",
    reparado,
    costoEstimado: 800000,
    declarante: ZERO,
  };
}

export async function deployCarPass() {
  const [admin, owner, workshop, stranger, insurer, inspector, buyer] =
    await ethers.getSigners();
  const carPass = await ethers.deployContract("CarPass");
  await carPass.waitForDeployment();

  const roles = {
    mechanic: await carPass.MECANICO_ROLE(),
    insurer: await carPass.ASEGURADORA_ROLE(),
    inspector: await carPass.INSPECTOR_VTV_ROLE(),
  };

  await carPass.grantRole(roles.mechanic, workshop.address);
  await carPass.grantRole(roles.insurer, insurer.address);
  await carPass.grantRole(roles.inspector, inspector.address);

  return { admin, owner, workshop, stranger, insurer, inspector, buyer, carPass, roles };
}

export async function mintVehicle(
  carPass: CarPassContract,
  owner: { address: string },
  vin = "8AJBA3CD4E1234567",
) {
  const tokenId = await carPass.vinToTokenId(vin);
  await carPass.registrarVehiculo(vehicleInfo(vin), owner.address);
  return { tokenId, vin };
}

export async function currentPlus(seconds: number) {
  const block = await ethers.provider.getBlock("latest");
  assert.ok(block, "latest block not found");
  return Number(block.timestamp) + seconds;
}
