import { demoNumerosGrabado } from "../../scripts/lib/demoParts.js";
import { deployCarPass, ethers, mintVehicle, type CarPassContract } from "./carPass.js";

export type VehiclePartsContract = Awaited<ReturnType<typeof ethers.deployContract>>;

export async function deployVehicleParts(carPassAddress: string) {
  const vehicleParts = await ethers.deployContract("VehicleParts", [carPassAddress]);
  await vehicleParts.waitForDeployment();
  return vehicleParts;
}

export function numerosGrabadoForVin(vin: string) {
  return demoNumerosGrabado(vin);
}

export async function partesInstaladas(vehicleParts: VehiclePartsContract, vehicleTokenId: bigint) {
  const partes = await vehicleParts.getPartesVehiculo(vehicleTokenId);
  return partes.some((parte: { numeroGrabado: string }) => parte.numeroGrabado.trim().length > 0);
}

export async function mintVehicleWithParts(
  carPass: CarPassContract,
  vehicleParts: VehiclePartsContract,
  owner: { address: string },
  registrador: { address: string },
  vin: string,
) {
  const { tokenId } = await mintVehicle(carPass, owner, vin);
  await vehicleParts.connect(registrador).registrarPartes(tokenId, numerosGrabadoForVin(vin));
  return { tokenId, vin };
}
