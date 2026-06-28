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
| EPIC-07 | Contract Test Suite | Contrato | 03-06 | MVP minimo, Fase 2 completa | PARTIAL |
| EPIC-08 | Deployment & On-chain Verification | Contrato | 07 | MVP | BLOCKED |
| EPIC-09 | Frontend Scaffold & Wallet Connection | Frontend | 08 | MVP | DONE |
| EPIC-10 | Contract Integration Layer | Frontend | 08, 09 | MVP | DONE |
| EPIC-11 | Role-Based Forms | Frontend | 10 | MVP alta + service, Fase 2 resto | DONE |
| EPIC-12 | Public QR Verification | Frontend | 10 | Fuera de alcance | OUT |
| EPIC-13 | IPFS Document Storage | Frontend / Servicio | 05, 11 | Fuera de alcance | OUT |

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

Estado: `BLOCKED`.

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

Estado: `PARTIAL`.

Implementado:

- Suite MVP `test/CarPass.km.ts`.
- Script `npm run test:contracts`.
- Cobertura minima de service valido y rechazo por kilometraje menor.

Falta:

- Completar cobertura final de rechazos y estados si se trabaja EPIC-07.
- Verificar suite con Node compatible.

Spec:

- `docs/sdd/EPIC-07-contract-test-suite.md`.

### EPIC-08 - Deployment & On-chain Verification

Estado: `PARTIAL`.

Implementado:

- `scripts/deploy.ts`.
- `scripts/seed.ts` con datos demo.
- `scripts/export-frontend-artifacts.mjs`.
- `deployments/sepolia/CarPass.json` con la address publica heredada del seed.
- ABI/address exportados a `frontend/src/contracts/`.
- Variables de entorno Sepolia documentadas.

Falta:

- Verificar compile/deploy con Node `22.13.0+`.
- Confirmar si la address heredada sigue siendo la final para defensa o redeployar.
- Verificacion del contrato en explorador si se requiere para entrega.

Bloqueo:

- El entorno actual usa Node `20.18.1`; Hardhat 3 requiere Node `22.13.0+`.

Spec:

- `docs/sdd/EPIC-08-deployment-onchain-verification.md`.

### EPIC-09 - Frontend Scaffold & Wallet Connection

Estado: `DONE`.

Implementado:

- DApp React.
- Conexion MetaMask.
- Validacion de Sepolia por chain id.
- Deteccion de rol on-chain.
- Ruteo por rol.
- Listeners para cambios de cuenta/red.
- Vista publica accesible sin operar wallet.

Falta:

- Nada funcional dentro del alcance actual.

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

## Decisiones de Equipo

| Decision | Estado recomendado | Motivo |
| --- | --- | --- |
| Sello vs score | Cerrado: sello enum | El contrato y frontend ya trabajan con `ACTIVO`, `VENCIDO`, `REVOCADO`. |
| ERC-20 / AutoTrust Token | Fuera del nucleo | No aporta al MVP ni al alcance principal del TP. |
| IPFS | Fuera de alcance | Es almacenamiento documental externo; no hace falta para demostrar trazabilidad on-chain. |
| Roles | Cerrado: 5 roles | Admin, registrador, mecanico, aseguradora, inspector VTV. |
| Alta del vehiculo | Cerrado: registrador/concesionaria | Ya esta implementado con `REGISTRADOR_ROLE`. |
| ABI frontend | Pendiente | Conviene exportar desde artifacts para evitar desincronizacion. |

## Bloqueos Conocidos

- `npm run compile` no verifica en Node `20.18.1`; Hardhat 3 requiere Node `22.13.0+`.
- Hay implementacion de frontend por encima de specs canonicas, por lo que antes de tocar pantallas conviene escribir o consolidar SDD de EPIC-09 a EPIC-11.

## Regla de Trabajo

Antes de implementar cambios nuevos:

1. Ubicar la epica en este backlog.
2. Confirmar o escribir su SDD en `docs/sdd/`.
3. Si cambia ABI, documentarlo antes de usarlo desde frontend.
4. Verificar con comandos reales permitidos por `AGENTS.md`.
