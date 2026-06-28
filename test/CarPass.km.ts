import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.create();

type RevertError = Error & {
  data?: string;
  error?: RevertError;
  info?: {
    error?: RevertError;
  };
};

function getErrorData(error: unknown): string | undefined {
  const typedError = error as RevertError;
  return (
    typedError.data ??
    typedError.error?.data ??
    typedError.info?.error?.data ??
    typedError.info?.error?.error?.data
  );
}

async function expectCustomError(
  action: () => Promise<unknown>,
  contract: Awaited<ReturnType<typeof ethers.deployContract>>,
  expectedName: string,
  expectedArgs: readonly unknown[],
) {
  try {
    await action();
  } catch (error) {
    const errorData = getErrorData(error);
    assert.ok(errorData, `Expected ${expectedName}, but revert data was not found`);

    const parsedError = contract.interface.parseError(errorData);
    assert.equal(parsedError?.name, expectedName);
    assert.deepEqual([...parsedError!.args], [...expectedArgs]);
    return;
  }

  assert.fail(`Expected ${expectedName} revert`);
}

function vehicleInfo(vin: string) {
  return {
    vin,
    marca: "Toyota",
    modelo: "Corolla",
    anio: 2024,
    color: "Blanco",
  };
}

function serviceRecord(kilometraje: number, tipoServicio = "Service oficial") {
  return {
    timestamp: 0,
    tipoServicio,
    kilometraje,
    taller: ethers.ZeroAddress,
    descripcion: "Cambio de aceite y control general",
  };
}

async function deployCarPassWithVehicle() {
  const [, owner, workshop] = await ethers.getSigners();
  const carPass = await ethers.deployContract("CarPass");
  await carPass.waitForDeployment();

  const vin = "8AJBA3CD4E1234567";
  const tokenId = await carPass.vinToTokenId(vin);

  await carPass.registrarVehiculo(vehicleInfo(vin), owner.address);

  const mechanicRole = await carPass.MECANICO_ROLE();
  await carPass.grantRole(mechanicRole, workshop.address);

  return { owner, workshop, carPass, tokenId };
}

async function testValidService() {
  const { workshop, carPass, tokenId } = await deployCarPassWithVehicle();

  const tx = await carPass
    .connect(workshop)
    .agregarService(tokenId, serviceRecord(15_000));
  const receipt = await tx.wait();

  const serviceEvents = receipt?.logs
    .map((log) => {
      try {
        return carPass.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter((event) => event?.name === "ServiceAgregado");

  assert.equal(serviceEvents?.length, 1);
  assert.equal(serviceEvents?.[0]?.args.tokenId, tokenId);
  assert.equal(serviceEvents?.[0]?.args.tipoServicio, "Service oficial");

  const history = await carPass.getHistorialService(tokenId);
  assert.equal(history.length, 1);
  assert.equal(history[0].kilometraje, 15_000n);
  assert.equal(history[0].taller, workshop.address);
  assert.notEqual(history[0].timestamp, 0n);
  assert.equal(await carPass.ultimoKilometrajeRegistrado(tokenId), 15_000n);
}

async function testRejectsLowerMileage() {
  const { workshop, carPass, tokenId } = await deployCarPassWithVehicle();

  await carPass.connect(workshop).agregarService(tokenId, serviceRecord(15_000));

  await expectCustomError(
    () => carPass.connect(workshop).agregarService(tokenId, serviceRecord(14_999)),
    carPass,
    "KilometrajeNoMonotonico",
    [14_999n, 15_000n],
  );

  const history = await carPass.getHistorialService(tokenId);
  assert.equal(history.length, 1);
  assert.equal(await carPass.ultimoKilometrajeRegistrado(tokenId), 15_000n);
}

await testValidService();
await testRejectsLowerMileage();

console.log("EPIC-07 contract MVP passed: service km valid path and lower-km rejection.");
