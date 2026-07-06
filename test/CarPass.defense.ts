import assert from "node:assert/strict";
import {
  YEAR,
  currentPlus,
  deployCarPass,
  expectCustomError,
  mintVehicle,
  serviceRecord,
  siniestroRecord,
  vehicleInfo,
  vtvRecord,
} from "./helpers/carPass.js";

async function testValidService() {
  const { owner, workshop, carPass } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

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
  const { owner, workshop, carPass } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

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

async function testRejectsDuplicateVin() {
  const { owner, carPass } = await deployCarPass();
  const { vin } = await mintVehicle(carPass, owner);

  await expectCustomError(
    () => carPass.registrarVehiculo(vehicleInfo(vin), owner.address),
    carPass,
    "VehiculoYaRegistrado",
    [vin],
  );
}

async function testRejectsUnauthorizedService() {
  const { owner, stranger, carPass, roles } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

  await expectCustomError(
    () => carPass.connect(stranger).agregarService(tokenId, serviceRecord(10_000)),
    carPass,
    "AccessControlUnauthorizedAccount",
    [stranger.address, roles.mechanic],
  );
}

async function testRejectsNonOwnerTransfer() {
  const { owner, stranger, buyer, carPass } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

  await expectCustomError(
    () => carPass.connect(stranger).transferFrom(owner.address, buyer.address, tokenId),
    carPass,
    "TransferenciaSoloPropietario",
    [stranger.address, tokenId],
  );
}

async function testOwnerCanTransferVehicle() {
  const { owner, buyer, carPass } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

  await carPass.connect(owner).transferFrom(owner.address, buyer.address, tokenId);

  assert.equal(await carPass.ownerOf(tokenId), buyer.address);
}

async function testRevocationPreservesHistoryAndBlocksFutureWrites() {
  const { owner, workshop, carPass, roles } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

  await carPass.connect(workshop).agregarService(tokenId, serviceRecord(10_000));
  await carPass.revokeRole(roles.mechanic, workshop.address);

  assert.equal(await carPass.estaRevocado(workshop.address), true);

  await expectCustomError(
    () => carPass.connect(workshop).agregarService(tokenId, serviceRecord(20_000)),
    carPass,
    "AccessControlUnauthorizedAccount",
    [workshop.address, roles.mechanic],
  );

  const history = await carPass.getHistorialService(tokenId);
  assert.equal(history.length, 1);
  assert.equal(history[0].taller, workshop.address);
}

async function testQualitySealActive() {
  const { owner, workshop, inspector, carPass } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

  await carPass.connect(workshop).agregarService(tokenId, serviceRecord(10_000));
  await carPass.connect(inspector).agregarVTV(tokenId, vtvRecord(0, await currentPlus(YEAR)));

  const [estado, motivo] = await carPass.getSelloCalidad(tokenId);
  assert.equal(estado, 0n);
  assert.equal(motivo, "Sello valido");
}

async function testQualitySealWarnsWithoutVtv() {
  const { owner, workshop, carPass } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

  await carPass.connect(workshop).agregarService(tokenId, serviceRecord(10_000));

  const [estado, motivo] = await carPass.getSelloCalidad(tokenId);
  assert.equal(estado, 1n);
  assert.equal(motivo, "Sin VTV registrada");
}

async function testQualitySealRevokedBySevereUnrepairedAccident() {
  const { owner, workshop, inspector, insurer, carPass } = await deployCarPass();
  const { tokenId } = await mintVehicle(carPass, owner);

  await carPass.connect(workshop).agregarService(tokenId, serviceRecord(10_000));
  await carPass.connect(inspector).agregarVTV(tokenId, vtvRecord(0, await currentPlus(YEAR)));
  await carPass.connect(insurer).agregarSiniestro(tokenId, siniestroRecord(2, false));

  const [estado, motivo] = await carPass.getSelloCalidad(tokenId);
  assert.equal(estado, 2n);
  assert.equal(motivo, "Siniestro grave sin reparacion registrada");
}

await testValidService();
await testRejectsLowerMileage();
await testRejectsDuplicateVin();
await testRejectsUnauthorizedService();
await testRejectsNonOwnerTransfer();
await testOwnerCanTransferVehicle();
await testRevocationPreservesHistoryAndBlocksFutureWrites();
await testQualitySealActive();
await testQualitySealWarnsWithoutVtv();
await testQualitySealRevokedBySevereUnrepairedAccident();

console.log("CarPass contract suite passed: km, roles, duplicate VIN, transfer, revocation and seal states.");
