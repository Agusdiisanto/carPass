# EPIC-28 - Blockchain Defense Pack

## Problema

CarPass ya tiene contratos, oracle, autopartes y lectura publica. La siguiente mejora es hacer que esas capacidades se vean y se puedan defender como infraestructura blockchain completa:

- evidencias oracle demo reales;
- diagnostico blockchain visible;
- trazabilidad de procedencia por VIN;
- explicacion visible de EIP-712;
- mecanismo eficiente para evidencias masivas mediante Merkle roots.

## Alcance

- Extender `CarPassOracle` con lotes Merkle de evidencia.
- Agregar script `seed:oracle:sepolia` idempotente.
- Agregar componentes frontend walletless/admin para health blockchain.
- Mejorar panel de evidencia oracle con provenance y EIP-712.
- Actualizar docs, backlog y comandos.

Fuera de alcance:

- Chainlink Functions.
- Indexer backend propio.
- Tests nuevos.
- Validaciones frontend automatizadas.

## Contrato

`CarPassOracle` agrega:

```solidity
struct EvidenceBatch {
    bytes32 merkleRoot;
    bytes32 metadataHash;
    address oracle;
    uint64 reportedAt;
    AttestationKind kind;
    AttestationStatus status;
}

mapping(bytes32 => EvidenceBatch) public evidenceBatches;
mapping(uint256 => bytes32[]) private _vehicleBatchIds;
```

Funciones:

```solidity
function submitEvidenceBatch(
    uint256 vehicleTokenId,
    AttestationKind kind,
    bytes32 merkleRoot,
    bytes32 metadataHash
) external onlyRole(ORACLE_ROLE) returns (bytes32 batchId);

function updateEvidenceBatchStatus(bytes32 batchId, AttestationStatus status) external;

function getVehicleEvidenceBatchIds(uint256 vehicleTokenId)
    external
    view
    returns (bytes32[] memory);
```

Eventos:

```solidity
event EvidenceBatchSubmitted(...);
event EvidenceBatchStatusUpdated(...);
```

Reglas:

- El vehiculo debe existir en `CarPass`.
- `merkleRoot` y `metadataHash` no pueden ser cero.
- El lote queda deduplicado por `vehicleTokenId`, `kind`, `merkleRoot`.
- Solo admin u oracle original puede cambiar estado.

## Seed oracle

`npm run seed:oracle:sepolia`:

- resuelve `CarPass` y `CarPassOracle`;
- verifica que el deployer tenga `ORACLE_ROLE`;
- toma VINs demo;
- sube atestaciones demo si no existen;
- sube un lote Merkle demo para autopartes/VTV;
- no guarda secretos ni documentos.

## UX

### Consulta publica

El panel oracle muestra:

- si la evidencia es directa, firmada EIP-712 o batch Merkle;
- oracle emisor;
- tx/procedencia conceptual;
- hashes acortados;
- roots Merkle disponibles.

### Admin / defensa

Se agrega un panel de health blockchain visible para admins:

- CarPass configurado;
- VehicleParts configurado;
- CarPassOracle configurado;
- registry/export presente;
- que falta para cerrar Sepolia.

## Seguridad

- No se suben documentos completos.
- Solo hashes y roots.
- Lectura publica sin wallet.
- Escrituras siguen roleadas.
- No se agregan claves a variables `VITE_`.

## Verificacion permitida

- `npm run compile`
- `npm run export:frontend`
- `npm run registry:sepolia`
- `npm run health:sepolia`
- `npm audit --audit-level=high`
- `git diff --check`

No correr build/lint/e2e/Playwright/frontend audit salvo pedido explicito.
