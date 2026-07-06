# Oracle Attestations & Blockchain Ops Health

## Problema

CarPass ya registra vehiculos, hitos tecnicos, VTV, siniestros y autopartes on-chain. La mejora pendiente es demostrar una integracion blockchain mas completa: datos externos verificables, trazabilidad de fuentes y una verificacion operativa que diga si Sepolia, contratos, ABIs, roles y deploys estan alineados.

No se busca agregar un oracle decorativo. El objetivo es representar evidencia externa real o simulada para defensa: VTV, service, aseguradora, kilometraje, autopartes o documentos pueden ser atestados por una wallet oracle autorizada y quedar vinculados al `tokenId` del vehiculo.

## Alcance

- Nuevo contrato `CarPassOracle`, independiente de `CarPass`.
- `CarPassOracle` valida que el vehiculo exista en `CarPass`.
- El contrato permite atestaciones directas por wallets con `ORACLE_ROLE`.
- El contrato permite atestaciones firmadas EIP-712 por un oracle autorizado, enviadas por cualquier relayer.
- Cada atestacion guarda hashes, no documentos completos.
- Nuevo deploy script para Sepolia.
- Export de ABI/address al frontend.
- Registry consolidado en `deployments/sepolia/registry.json`.
- Health script `npm run health:sepolia` para revisar integracion blockchain.

Fuera de alcance:

- Chainlink Functions o nodos oracle externos.
- IPFS/pinning documental.
- Cambios visuales de frontend.
- Tests nuevos.

## Contrato

### Roles

| Rol | Quien lo administra | Permisos |
| --- | --- | --- |
| `DEFAULT_ADMIN_ROLE` | Deployer/admin | Otorga/revoca `ORACLE_ROLE`, cambia estado de atestaciones |
| `ORACLE_ROLE` | Admin | Crea atestaciones directas o firma atestaciones EIP-712 |

### Tipos

```solidity
enum AttestationKind {
    VTV,
    SERVICE,
    SINIESTRO,
    KILOMETRAJE,
    AUTOPARTES,
    DOCUMENTO
}

enum AttestationStatus {
    VIGENTE,
    OBSERVADA,
    REVOCADA
}
```

### Storage publico

```solidity
mapping(bytes32 => Attestation) public attestations;
mapping(address => uint256) public nonces;
```

### Funciones publicas

```solidity
function submitAttestation(
    uint256 vehicleTokenId,
    AttestationKind kind,
    bytes32 externalIdHash,
    bytes32 payloadHash,
    uint64 validUntil
) external onlyRole(ORACLE_ROLE) returns (bytes32 attestationId);

function submitSignedAttestation(
    uint256 vehicleTokenId,
    AttestationKind kind,
    bytes32 externalIdHash,
    bytes32 payloadHash,
    uint64 validUntil,
    address oracle,
    uint256 deadline,
    bytes calldata signature
) external returns (bytes32 attestationId);

function updateAttestationStatus(
    bytes32 attestationId,
    AttestationStatus status
) external;

function getVehicleAttestationIds(uint256 vehicleTokenId)
    external
    view
    returns (bytes32[] memory);

function getVehicleAttestationCount(uint256 vehicleTokenId)
    external
    view
    returns (uint256);
```

## Eventos

```solidity
event AttestationSubmitted(
    bytes32 indexed attestationId,
    uint256 indexed vehicleTokenId,
    AttestationKind indexed kind,
    address oracle,
    bytes32 externalIdHash,
    bytes32 payloadHash,
    uint64 reportedAt,
    uint64 validUntil
);

event AttestationStatusUpdated(
    bytes32 indexed attestationId,
    AttestationStatus status,
    address updatedBy
);
```

## Errores

- `VehiculoOracleNoExiste(uint256 vehicleTokenId)`: no existe NFT vehicular en `CarPass`.
- `OracleNoAutorizado(address oracle)`: la wallet no tiene `ORACLE_ROLE`.
- `HashInvalido()`: `externalIdHash` o `payloadHash` es cero.
- `AttestationDuplicada(bytes32 dedupeKey)`: ya existe una atestacion para vehiculo/tipo/id externo.
- `AttestationNoEncontrada(bytes32 attestationId)`: se intenta actualizar una atestacion inexistente.
- `FirmaExpirada(uint256 deadline)`: la firma EIP-712 vencio.
- `FirmaInvalida(address recovered, address expected)`: la firma no pertenece al oracle esperado.

## Reglas de seguridad

- No se suben documentos ni datos sensibles completos, solo hashes.
- `submitAttestation` requiere `ORACLE_ROLE`.
- `submitSignedAttestation` verifica EIP-712, `nonce`, `deadline` y `ORACLE_ROLE`.
- `nonce` evita replay de firmas.
- Una atestacion queda deduplicada por `(vehicleTokenId, kind, externalIdHash)`.
- El cambio de estado solo lo puede hacer admin u oracle original.
- El contrato no itera sobre listas no acotadas en escrituras.

## Infraestructura

### Deploy

```bash
npm run deploy:oracle:sepolia
npm run export:frontend
npm run registry:sepolia
```

El deploy escribe:

- `deployments/sepolia/CarPassOracle.json`
- `deployments/sepolia/registry.json`

### Health

```bash
npm run health:sepolia
```

Verifica:

- RPC Sepolia.
- Address valida para `CarPass`, `VehicleParts` y `CarPassOracle`.
- Bytecode desplegado.
- `VehicleParts.carPass()` enlazado al `CarPass` actual.
- `CarPassOracle.carPass()` enlazado al `CarPass` actual.
- Artifacts compilados.
- ABI hash de registry contra artifact local.
- Demo VINs y autopartes via `verify:deployment` cuando se corre el flujo completo.

## Impacto ABI/frontend

Se agrega una ABI nueva:

- `frontend/src/contracts/carPassOracleAbi.ts`
- `frontend/src/contracts/carPassOracleDeployment.ts`

No cambia ABI de `CarPass` ni de `VehicleParts`.

## Criterios de aceptacion

- `npm run compile` compila `CarPassOracle`.
- `npm run export:frontend` exporta la ABI nueva.
- `npm run registry:sepolia` genera registry consolidado sin secretos.
- `npm run health:sepolia` reporta estado real y falla si falta deploy/config.
- `.env.example` documenta las variables nuevas.
- `docs/DEPLOY.md` explica el flujo de oracle y health.
