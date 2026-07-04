# Backlog CarPass

Seminario de Blockchain 2026 S1 · Trabajo Final Agustin Di Santo · Ezequiel Gonzalez · Andres Mora

## Estado General

CarPass esta mas avanzado que el MVP original: el contrato ya incluye NFT por VIN, roles, services, siniestros, VTV, revocacion trazable, transferencia owner-only y sello de calidad. El frontend ya tiene wallet, ruteo por rol, formularios operativos y consulta publica por VIN.

El trabajo pendiente principal no es agregar mas alcance a ciegas, sino ordenar el cierre: congelar ABI, documentar deploy real, alinear specs y verificar con Node compatible.

## Convenciones de Estado

- `DONE`: implementado y documentado en SDD.
- `PARTIAL`: hay implementacion, pero faltan piezas de cierre o documentacion.
- `PENDING`: no implementado.
- `OUT`: decidido fuera de alcance.
- `BLOCKED`: no se puede verificar o cerrar hasta resolver una condicion externa.

## Resumen de Epicas

| ID | Epica | Capa | Depende de | Alcance | Estado |
| --- | --- | --- | --- | --- | --- |
| EPIC-01 | Project Setup & Tooling | Infra | - | MVP | DONE |
| EPIC-02 | Core Data Model & Contract Skeleton | Contrato | 01 | MVP, diseno completo | DONE |
| EPIC-03 | Vehicle NFT ERC-721 | Contrato | 02 | MVP mint, Fase 2 transferencia | DONE |
| EPIC-04 | Roles & Access Control | Contrato | 02 | MVP roles, Fase 2 revocacion | DONE |
| EPIC-05 | Event Logging & Validation Rules | Contrato | 03, 04 | MVP service + km | PARTIAL |
| EPIC-06 | Decision Engine & Quality Seal | Contrato | 05 | Fase 2 | DONE |
| EPIC-07 | Contract Test Suite | Contrato | 03-06 | MVP + defensa | DONE |
| EPIC-08 | Deployment & On-chain Verification | Contrato | 07 | MVP | PARTIAL |
| EPIC-09 | Frontend Scaffold & Wallet Connection | Frontend | 08 | MVP | DONE |
| EPIC-10 | Contract Integration Layer | Frontend | 08, 09 | MVP | DONE |
| EPIC-11 | Role-Based Forms | Frontend | 10 | MVP alta + service, Fase 2 resto | DONE |
| EPIC-12 | Public QR Verification | Frontend | 10 | Fuera de alcance | OUT |
| EPIC-13 | IPFS Document Storage | Frontend / Servicio | 05, 11 | Fuera de alcance | OUT |
| EPIC-14 | Public Read Orchestration & Defense Mode | Frontend / Infra | 08, 10, 11 | Defensa online | DONE |

## Camino de Cierre Recomendado

1. Resolver entorno: usar Node `22.13.0+` para Hardhat 3 y volver a ejecutar `npm run compile`.
2. Cerrar EPIC-08: deploy/verificacion real en Sepolia si hace falta redeploy.
3. Dejar EPIC-12 y EPIC-13 documentadas como fuera de alcance para no abrir integraciones nuevas.

## Detalle por Epica

### EPIC-01 - Project Setup & Tooling

Estado: `DONE`.

Implementado:

- Hardhat 3, OpenZeppelin, ethers y TypeScript en raiz.
- Scripts `compile`, `deploy:sepolia`, `seed:sepolia`, `frontend:dev`.
- Frontend Vite + React + TypeScript en `frontend/`.
- `.env.example`, `.gitignore`, README y documentacion para agentes.

Falta:

- Nada funcional. Mantener setup actualizado si cambian variables.

Spec:

- `docs/superpowers/specs/2026-06-23-carpass-infra-design.md`.

### EPIC-02 - Core Data Model & Contract Skeleton

Estado: `DONE`.

Implementado:

- Structs de vehiculo, service, siniestro, VTV y sello.
- Enums de gravedad, resultado VTV y estado de sello.
- Roles y eventos base.
- Derivacion de `tokenId` por `keccak256(vin)`.
- Consultas publicas de historial.

Spec:

- `docs/sdd/EPIC-02-core-data-model-contract-skeleton.md`.

### EPIC-03 - Vehicle NFT ERC-721

Estado: `DONE`.

Implementado:

- `registrarVehiculo` con `REGISTRADOR_ROLE`.
- VIN valido por longitud 17.
- Unicidad por tokenId deterministico.
- `VehicleMinted`.
- `transferFrom` y `safeTransferFrom` restringidos al propietario directo.

Spec:

- `docs/sdd/EPIC-03-registro-nft-vin.md`.

### EPIC-04 - Roles & Access Control

Estado: `DONE`.

Implementado:

- `DEFAULT_ADMIN_ROLE`, `REGISTRADOR_ROLE`, `MECANICO_ROLE`, `ASEGURADORA_ROLE`, `INSPECTOR_VTV_ROLE`.
- Proteccion de mutadores por rol.
- `grantRole` heredado.
- `revokeRole` con `revocadoEn` y evento `WalletRevocada`.
- `estaRevocado`.

Spec:

- `docs/sdd/EPIC-04-roles-access-control.md`.

### EPIC-05 - Event Logging & Validation Rules

Estado: `PARTIAL`.

Implementado:

- `agregarService` restringido a `MECANICO_ROLE`.
- Kilometraje estrictamente creciente.
- Autor y timestamp sobrescritos on-chain.
- `ultimoKilometrajeRegistrado`.
- Carga append-only de siniestros y VTV con roles correctos.

Falta:

- Reglas avanzadas de coherencia para VTV y siniestros si entran al alcance final.
- Definir si la VTV rechazada o el siniestro grave son reversibles por eventos posteriores o solo afectan el sello actual.

Spec:

- `docs/sdd/EPIC-05-event-logging-validation-rules.md`.

### EPIC-06 - Decision Engine & Quality Seal

Estado: `DONE`.

Implementado:

- `getSelloCalidad`.
- `getSelloEstado`.
- `calcularSello` con cache opcional y evento `SelloActualizado`.
- Reglas para VTV rechazada, siniestro grave sin reparar, sin VTV, VTV vencida, VTV con observaciones, sin service y service vencido.

Spec:

- `docs/sdd/EPIC-06-decision-engine-quality-seal.md`.

### EPIC-07 - Contract Test Suite

Estado: `DONE`.

Implementado:

- Suite de defensa `test/CarPass.defense.ts` con helpers compartidos en `test/helpers/carPass.ts`.
- Script `npm run test:contracts`.
- Service valido y rechazo por kilometraje menor.
- Doble VIN.
- Wallet sin rol.
- Transferencia por no-owner.
- Revocacion de taller conservando historial previo.
- Sello `ACTIVO`, `VENCIDO` y `REVOCADO`.

Falta:

- Solo quedarian bordes extra de auditoria si el equipo quiere ir mas alla de la defensa.

Spec:

- `docs/sdd/EPIC-07-contract-test-suite.md`.

### EPIC-08 - Deployment & On-chain Verification

Estado: `PARTIAL`.

Implementado:

- `scripts/deploy.ts`.
- `scripts/check-deploy-readiness.mjs`.
- `scripts/seed.ts` con datos demo idempotentes.
- `scripts/export-frontend-artifacts.mjs`.
- `docs/DEPLOY.md` con receta operativa de Sepolia y seed.
- `deployments/sepolia/CarPass.json` con la address publica heredada del seed.
- ABI/address exportados a `frontend/src/contracts/`.
- Variables de entorno Sepolia documentadas.

Falta:

- Ejecutar deploy real en Sepolia si se decide redeployar.
- Confirmar si la address heredada sigue siendo la final para defensa o redeployar.
- Verificacion del contrato en explorador si se requiere para entrega.

Bloqueo:

- Deploy, seed y verificacion on-chain requieren credenciales locales (`SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`) y fondos Sepolia.

Spec:

- `docs/sdd/EPIC-08-deployment-onchain-verification.md`.

### EPIC-09 - Frontend Scaffold & Wallet Connection

Estado: `DONE`.

Implementado:

- DApp React.
- Conexion MetaMask (extension inyectada).
- Conexion desktop sin extension via QR (`@metamask/connect-evm`).
- Deep link mobile (`metamask.app.link`) y banner `MobileWalletHint`.
- Validacion de Sepolia por chain id.
- Deteccion de rol on-chain.
- Ruteo por rol.
- Listeners para cambios de cuenta/red.
- Vista publica accesible sin operar wallet.
- Provider activo unificado (`getActiveEthereum`) para extension y Connect.

Falta:

- Nada funcional dentro del alcance actual del SDD.

Spec:

- `docs/sdd/EPIC-09-frontend-scaffold-wallet-connection.md`.
- `docs/sdd/EPIC-09-admin-role-view-switcher.md`.

### EPIC-10 - Contract Integration Layer

Estado: `DONE`.

Implementado:

- Hook `useCarPass`.
- ABI importado desde `frontend/src/contracts/carpassAbi.ts`.
- Address por env o `frontend/src/contracts/carpassDeployment.ts`.
- Instancia ethers por signer/reader.
- Lecturas de vehiculo, historial, sello y ultimo kilometraje.
- Escrituras de alta, service, siniestro, VTV, grant y revoke.
- Manejo basico de errores y estados de transaccion.

Falta:

- Nada funcional dentro del alcance actual.

Spec:

- `docs/sdd/EPIC-10-contract-integration-layer.md`.
- `docs/sdd/EPIC-10-aseguradora-only-siniestros-zero-km.md` cubre una decision puntual, no toda la epica.

### EPIC-11 - Role-Based Forms

Estado: `DONE`.

Implementado:

- Admin: alta de vehiculo y gestion de roles.
- Registrador: alta de vehiculo.
- Taller: carga de service con validacion de km.
- Aseguradora: carga de siniestro.
- Inspector VTV: carga de VTV.
- Vista de lectura publica de historial.
- Validacion basica de addresses en alta y gestion de roles.

Falta:

- Nada funcional dentro del alcance actual.

Spec:

- `docs/sdd/EPIC-11-role-based-forms.md`.

### EPIC-12 - Public QR Verification

Estado: `OUT`.

Implementado:

- Consulta publica por VIN.
- Historial combinado.
- Sello visible sin requerir operacion de wallet.
- VINs demo enlazados al seed.

Decision:

- QR queda descartado del alcance actual.
- La consulta publica por VIN se mantiene como reemplazo suficiente para la demo.

### EPIC-13 - IPFS Document Storage

Estado: `OUT`.

Que era:

- IPFS era una opcion para subir documentos pesados fuera de blockchain, por ejemplo facturas o informes, y guardar on-chain solo el hash/enlace.

Decision:

- Queda fuera del alcance actual.
- No se agregan proveedores de pinning, variables nuevas ni adjuntos documentales.

### EPIC-14 - Public Read Orchestration & Defense Mode

Estado: `DONE`.

Objetivo:

- Mantener la defensa online y en tiempo real usando Sepolia como fuente primaria.
- Agregar una capa de lectura publica con fallback a snapshot sincronizado si el RPC falla.
- Mostrar en UI si el dato viene de `Live Sepolia`, `Snapshot Sepolia` o `Demo local`.

Alcance recomendado:

- `VehicleReadService` con fuentes `OnChainVehicleSource`, `SnapshotVehicleSource` y `DemoVehicleSource`.
- Hook `usePublicVehicleLookup` para que la vista publica deje de depender directamente de `useCarPass`.
- Script `npm run sync:public-snapshot` para exportar los VINs oficiales de defensa desde Sepolia.
- Indicadores en `RuntimeStrip` sobre contrato, RPC, snapshot y fuente de lectura.

Implementado:

- Capa de lectura publica con live Sepolia, snapshot sincronizado y demo local.
- Snapshot versionado en `frontend/src/data/publicVehicleSnapshot.json`.
- Comandos `sync:public-snapshot` y `defense:prepare`.
- Fuente visible en la vista publica: `Live Sepolia`, `Snapshot Sepolia` o `Demo local`.

Spec:

- `docs/sdd/EPIC-14-public-read-orchestration-defense-mode.md`.

## Decisiones de Equipo

| Decision | Estado recomendado | Motivo |
| --- | --- | --- |
| Sello vs score | Cerrado: sello enum | El contrato y frontend ya trabajan con `ACTIVO`, `VENCIDO`, `REVOCADO`. |
| ERC-20 / AutoTrust Token | Fuera del nucleo | No aporta al MVP ni al alcance principal del TP. |
| IPFS | Fuera de alcance | Es almacenamiento documental externo; no hace falta para demostrar trazabilidad on-chain. |
| Roles | Cerrado: 5 roles | Admin, registrador, mecanico, aseguradora, inspector VTV. |
| Alta del vehiculo | Cerrado: registrador/concesionaria | Ya esta implementado con `REGISTRADOR_ROLE`. |
| ABI frontend | Cerrado | Exportado desde artifacts con `npm run export:frontend`; repetir si cambia el contrato. |

## Bloqueos Conocidos

- Deploy real de EPIC-08 requiere credenciales locales y fondos Sepolia.
- Verificacion en explorador requiere decidir si se agrega plugin/flujo de verify o si se documenta manualmente para la entrega.

## Hardening antes de entrega

Estado: `PARTIAL`.

Implementado:

- Capa de dominio frontend en `frontend/src/domain/carpass/`.
- Validadores compartidos en `frontend/src/domain/carpass/validators.ts`.
- Busqueda reutilizable por VIN en `frontend/src/hooks/useVehicleLookup.ts`.
- Suite de defensa organizada con helpers.
- Seed demo idempotente.
- Guia de deploy en `docs/DEPLOY.md`.
- Mapa de codigo en `docs/CODEMAP.md`.

Pendiente recomendado:

- Limpiar mojibake restante en textos de UI/docs.
- Dividir `PublicView.tsx` en componentes mas chicos.
- Sumar tests puntuales de VIN invalido, km igual, autoria VTV/siniestro y VTV rechazada.
- Definir address final Sepolia y cerrar EPIC-08.

### Hardening de gas y limpieza (2026-07-03)

- Eliminado `calcularSello(uint256)`, evento `SelloActualizado` y mapping `_sellos`: la cache nunca era leida por ningun getter. Cambio de ABI documentado en `docs/sdd/EPIC-06-decision-engine-quality-seal.md`.
- Reordenados campos de `RegistroSiniestro` y `RegistroVTV` (`contracts/core/CarPassTypes.sol`) para mejorar el packing de storage (6→4 y 4→3 slots por registro respectivamente). Cambio de ABI documentado en `docs/sdd/EPIC-02-core-data-model-contract-skeleton.md`. ABI re-exportado a `frontend/src/contracts/` con `npm run export:frontend`.
- Evaluado bajar `VehicleMinted` a 2 `indexed` (de 3): descartado porque `frontend/src/lib/chainActivity.ts` filtra por `registrar` como tercer topic indexado para detectar mints hechos por la wallet conectada actuando como registrador.
- `frontend/src/hooks/useVehicleLookup.ts` y `usePublicVehicleLookup.ts` dejaron de instanciar `useCarPass()` completo (evitaba estado de React sin usar) y usan directamente las funciones de lectura exportadas a nivel de modulo; `useVehicleLookup` ahora usa `parseContractError` para mensajes de error consistentes con el resto de la app.
- `npm run compile` y `npm run test:contracts` verificados en verde despues de los cambios de contrato.

## EPIC-20 · Feed de actividad on-chain

Estado: `DONE`.

Spec: `docs/sdd/EPIC-20-chain-activity-feed.md`.

Implementado:

- Store `frontend/src/lib/chainActivity.ts` con persistencia por wallet en `sessionStorage`.
- Hidratación de mints y transfers desde logs del contrato CarPass.
- Feed colapsable `ChainActivityFeed` con links a Etherscan (wallet + contrato).
- Notificaciones operativas `OperationNotice` / `CarPassOperationNotice` con tx hash y bloque.
- Integración en `useCarPass.run()` para registrar cada transacción confirmada o fallida.
- Registro de conexión/desconexión de wallet y aviso de red incorrecta en `App.tsx`.
- Link a wallet en `RuntimeStrip` cuando hay sesión activa.

## Regla de Trabajo

Antes de implementar cambios nuevos:

1. Ubicar la epica en este backlog.
2. Confirmar o escribir su SDD en `docs/sdd/`.
3. Si cambia ABI, documentarlo antes de usarlo desde frontend.
4. Verificar con comandos reales permitidos por `AGENTS.md`.
