# Code Map

Mapa rapido para leer y defender CarPass.

## Contrato

- `contracts/CarPass.sol`: contrato principal ERC-721. Compone los modulos internos y conecta hooks ERC-721.
- `contracts/core/CarPassTypes.sol`: enums y structs del dominio vehicular.
- `contracts/core/CarPassErrors.sol`: custom errors del contrato.
- `contracts/core/CarPassStorage.sol`: mappings compartidos y hooks abstractos hacia ERC-721.
- `contracts/core/CarPassRoles.sol`: roles, revocacion trazable y consulta `estaRevocado`.
- `contracts/core/CarPassVehicleRegistry.sol`: alta de vehiculos, VIN y consultas base.
- `contracts/core/CarPassHistory.sol`: carga y lectura de services, siniestros y VTV.
- `contracts/core/CarPassSeal.sol`: calculo y cache opcional del sello de calidad.
- `contracts/core/CarPassTransfers.sol`: restriccion owner-only para transferencias.
- `contracts/VehicleParts.sol`: NFT de autopartes grabadas (EPIC-22), vinculado a `CarPass` por direccion inmutable; reutiliza `REGISTRADOR_ROLE`/`MECANICO_ROLE` via `hasRole` cross-contract.
- Responsabilidades: VIN unico, roles, services, siniestros, VTV, transferencias owner-only, revocacion trazable y sello de calidad.
- Invariantes clave:
  - `tokenId` se deriva de `keccak256(vin)`.
  - El VIN debe tener 17 caracteres.
  - El historial es append-only.
  - La autoria se sobrescribe con `msg.sender`.
  - El kilometraje de service es estrictamente creciente.
  - Revocar una wallet no borra registros previos.

## Scripts

- `scripts/deploy.ts`: despliega `CarPass` y escribe metadata de despliegue.
- `scripts/check-deploy-readiness.mjs`: valida entorno antes de Sepolia.
- `scripts/export-frontend-artifacts.mjs`: exporta ABI/address al frontend.
- `scripts/seed.ts`: carga VINs demo de forma idempotente.

## Tests

- `test/CarPass.defense.ts`: suite de defensa con caminos felices y rechazos principales.
- `test/helpers/carPass.ts`: helpers de deploy, registros y asserts de custom errors.

## Frontend Domain

- `frontend/src/domain/carpass/roles.ts`: labels y clases de roles.
- `frontend/src/domain/carpass/seal.ts`: estados visuales del sello.
- `frontend/src/domain/carpass/demoVehicles.ts`: VINs demo.
- `frontend/src/domain/carpass/formatters.ts`: VIN, km, fechas y numeros.
- `frontend/src/domain/carpass/eventLabels.ts`: labels de VTV y siniestros.
- `frontend/src/domain/carpass/errors.ts`: parsing de errores del contrato.
- `frontend/src/domain/carpass/validators.ts`: validaciones compartidas.

## Frontend Hooks

- `frontend/src/hooks/useWallet.ts`: conexion MetaMask (extension, deep link mobile, QR Connect) y red esperada.
- `frontend/src/hooks/useCarPass.ts`: operaciones de lectura/escritura contra el contrato.
- `frontend/src/hooks/useVehicleLookup.ts`: busqueda reutilizable por VIN.

## Frontend Wallet / Mobile

- `frontend/src/lib/ethereumProvider.ts`: modos de conexion, deep link MetaMask, `getActiveEthereum()`.
- `frontend/src/lib/metamaskConnect.ts`: cliente `@metamask/connect-evm` headless para QR desktop.
- `frontend/src/lib/deviceProfile.ts`: deteccion mobile, iOS y Safari.
- `frontend/src/lib/publicAppUrl.ts`: URL publica para deep links y companion desde localhost.
- `frontend/src/components/MobileWalletHint.tsx`: banner de conexion segun modo (desktop QR / mobile deeplink).
- `frontend/src/components/QrCodeImage.tsx`: render local de QR para emparejamiento wallet.

## Frontend Views

- `frontend/src/App.tsx`: shell, estado runtime y ruteo por rol.
- `frontend/src/views/PublicView.tsx`: consulta publica por VIN, sello e historial.
- `frontend/src/views/AdminView.tsx`: alta, roles y acceso a vistas operativas.
- `frontend/src/views/RegistradorView.tsx`: alta de vehiculos.
- `frontend/src/views/TallerView.tsx`: carga de services.
- `frontend/src/views/AseguradoraView.tsx`: carga de siniestros.
- `frontend/src/views/InspectorVTVView.tsx`: carga de VTV.
- `frontend/src/views/NoRoleView.tsx`: estado para wallet sin rol.

## Deploy y Defensa

- `docs/DEPLOY.md`: receta de deploy/seed en Sepolia.
- `docs/DEFENSA.md`: resumen para presentar.
- `.agents/backlog.md`: estado vivo de epicas y hardening pendiente.
