# Backlog Inicial CarPass

## EPIC-01 - Infraestructura

Base de proyecto con Hardhat, OpenZeppelin, ethers, Sepolia, Vite React y documentacion para agentes.

Estado: implementada como punto de partida.

## EPIC-02 - Contrato madre

Definir la interfaz estable del NFT vehicular:

- Identidad del vehiculo por VIN.
- Estructuras para hitos.
- Eventos publicos.
- Roles del sistema.
- Consultas publicas necesarias para QR.
- Reglas de errores custom.

Dependencias: EPIC-01.

## EPIC-03 - Registro NFT por VIN

Mint seguro de vehiculos como ERC-721, evitando VIN duplicado y exponiendo busquedas por VIN/tokenId.

Dependencias: EPIC-02.

## EPIC-04 - Historial tecnico

Registrar services, kilometraje, VTV, siniestros y transferencias con eventos inmutables.

Dependencias: EPIC-02, EPIC-03.

## EPIC-05 - Validaciones

Rechazar inconsistencias: kilometraje regresivo, fechas invalidas, VIN duplicado, operaciones sin rol y estados incompatibles.

Dependencias: EPIC-04.

## EPIC-06 - Sello de calidad

Calcular un sello consultable publicamente segun historial, vigencia de VTV, siniestros y consistencia de kilometraje.

Dependencias: EPIC-05.

## EPIC-07 - Roles

Ruteo de permisos para admin, taller, verificador, aseguradora y transferencia.

Dependencias: EPIC-02.

## EPIC-08 - Deploy Sepolia

Deploy reproducible, address documentado y ABI estable para frontend.

Dependencias: EPIC-02 a EPIC-07.
