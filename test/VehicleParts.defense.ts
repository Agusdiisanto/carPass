import assert from "node:assert/strict";
import {
  deployCarPass,
  ethers,
  expectCustomError,
  mintVehicle,
} from "./helpers/carPass.js";
import {
  deployVehicleParts,
  numerosGrabadoForVin,
  partesInstaladas,
} from "./helpers/vehicleParts.js";

async function testRegistersInitialParts() {
  const { admin, owner, carPass } = await deployCarPass();
  const carPassAddress = await carPass.getAddress();
  const vehicleParts = await deployVehicleParts(carPassAddress);

  const vin = "9BWZZZ377VT004251";
  const { tokenId } = await mintVehicle(carPass, owner, vin);
  const numeros = numerosGrabadoForVin(vin);

  const tx = await vehicleParts.connect(admin).registrarPartes(tokenId, numeros);
  const receipt = await tx.wait();

  const events = receipt?.logs
    .map((log) => {
      try {
        return vehicleParts.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter((event) => event?.name === "PartesRegistradas");

  assert.equal(events?.length, 1);
  assert.equal(events?.[0]?.args.vehicleTokenId, tokenId);
  assert.equal(await partesInstaladas(vehicleParts, tokenId), true);

  const motor = await vehicleParts.getParteActual(tokenId, 0);
  assert.equal(motor.numeroGrabado, numeros[0]);
  assert.equal(motor.reemplazada, false);
  assert.equal(await carPass.ownerOf(tokenId), owner.address);
}

async function testRejectsDuplicatePartRegistration() {
  const { admin, owner, carPass } = await deployCarPass();
  const vehicleParts = await deployVehicleParts(await carPass.getAddress());
  const vin = "9BWZZZ377VT004252";
  const { tokenId } = await mintVehicle(carPass, owner, vin);
  const numeros = numerosGrabadoForVin(vin);

  await vehicleParts.connect(admin).registrarPartes(tokenId, numeros);

  await expectCustomError(
    () => vehicleParts.connect(admin).registrarPartes(tokenId, numeros),
    vehicleParts,
    "PartesYaRegistradas",
    [tokenId],
  );
}

async function testRejectsPartsForMissingVehicle() {
  const { admin, carPass } = await deployCarPass();
  const vehicleParts = await deployVehicleParts(await carPass.getAddress());
  const missingTokenId = 999999n;
  const numeros = numerosGrabadoForVin("1HGBH41JXMN109186");

  await expectCustomError(
    () => vehicleParts.connect(admin).registrarPartes(missingTokenId, numeros),
    vehicleParts,
    "VehiculoInexistente",
    [missingTokenId],
  );
}

async function testRejectsReplacementWithoutInitialParts() {
  const { owner, workshop, carPass } = await deployCarPass();
  const vehicleParts = await deployVehicleParts(await carPass.getAddress());
  const { tokenId } = await mintVehicle(carPass, owner);

  await expectCustomError(
    () => vehicleParts.connect(workshop).reemplazarParte(tokenId, 0, "MOT-REPL-001"),
    vehicleParts,
    "PartesNoRegistradas",
    [tokenId],
  );
}

async function testReplacesPartAndKeepsHistory() {
  const { admin, owner, workshop, carPass } = await deployCarPass();
  const vehicleParts = await deployVehicleParts(await carPass.getAddress());
  const vin = "9BWZZZ377VT004253";
  const { tokenId } = await mintVehicle(carPass, owner, vin);
  const numeros = numerosGrabadoForVin(vin);

  await vehicleParts.connect(admin).registrarPartes(tokenId, numeros);
  const originalMotor = await vehicleParts.getParteActual(tokenId, 0);
  const nuevoGrabado = "MOT-REPL-999";

  await vehicleParts.connect(workshop).reemplazarParte(tokenId, 0, nuevoGrabado);

  const activeMotor = await vehicleParts.getParteActual(tokenId, 0);
  assert.equal(activeMotor.numeroGrabado, nuevoGrabado);
  assert.equal(activeMotor.reemplazada, false);

  const historial = await vehicleParts.getHistorialParte(tokenId, 0);
  assert.equal(historial.length, 2);
  assert.equal(historial[0].numeroGrabado, numeros[0]);
  assert.equal(historial[0].reemplazada, true);
  assert.equal(historial[1].numeroGrabado, nuevoGrabado);

  const retired = await vehicleParts.getParteActual(tokenId, 0);
  assert.notEqual(retired.numeroGrabado, originalMotor.numeroGrabado);
}

async function testRejectsPartTransfer() {
  const { admin, owner, stranger, carPass } = await deployCarPass();
  const vehicleParts = await deployVehicleParts(await carPass.getAddress());
  const vin = "9BWZZZ377VT004254";
  const { tokenId } = await mintVehicle(carPass, owner, vin);
  const numeros = numerosGrabadoForVin(vin);

  await vehicleParts.connect(admin).registrarPartes(tokenId, numeros);
  const motor = await vehicleParts.getParteActual(tokenId, 0);

  const partTokenId = BigInt(
    ethers.solidityPackedKeccak256(
      ["uint256", "uint8", "string"],
      [tokenId, 0, motor.numeroGrabado],
    ),
  );

  assert.equal(await vehicleParts.ownerOf(partTokenId), owner.address);

  await expectCustomError(
    () =>
      vehicleParts.connect(owner).transferFrom(owner.address, stranger.address, partTokenId),
    vehicleParts,
    "TransferenciaNoPermitida",
  );
}

await testRegistersInitialParts();
await testRejectsDuplicatePartRegistration();
await testRejectsPartsForMissingVehicle();
await testRejectsReplacementWithoutInitialParts();
await testReplacesPartAndKeepsHistory();
await testRejectsPartTransfer();

console.log(
  "VehicleParts defense suite passed: registration, rejection paths, replacement history and non-transferability.",
);
