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

Las `leaves` no se guardan en storage (seria gas redundante: ya viven en el evento
`EvidenceBatchSubmitted`, que es la fuente para reconstruir el arbol y generar proofs
fuera de la chain).

Funciones:

```solidity
function submitEvidenceBatch(
    uint256 vehicleTokenId,
    AttestationKind kind,
    bytes32[] calldata leaves,
    bytes32 metadataHash
) external onlyRole(ORACLE_ROLE) returns (bytes32 batchId, bytes32 merkleRoot);

function verifyEvidenceLeaf(
    bytes32 batchId,
    bytes32 leaf,
    bytes32[] calldata proof
) external view returns (bool);

function updateEvidenceBatchStatus(bytes32 batchId, AttestationStatus status) external;

function getVehicleEvidenceBatchIds(uint256 vehicleTokenId)
    external
    view
    returns (bytes32[] memory);
```

Eventos:

```solidity
event EvidenceBatchSubmitted(
    bytes32 indexed batchId,
    uint256 indexed vehicleTokenId,
    AttestationKind indexed kind,
    address oracle,
    bytes32 merkleRoot,
    bytes32 metadataHash,
    uint64 reportedAt,
    bytes32[] leaves
);
event EvidenceBatchStatusUpdated(...);
```

Reglas:

- El vehiculo debe existir en `CarPass`.
- El oracle envia las `leaves` (hashes individuales de cada evidencia); el contrato
  calcula `merkleRoot` on-chain con `Hashes.commutativeKeccak256` (par ordenado por
  nivel, nodo impar promovido sin hashear) y lo devuelve junto con `batchId`. El root
  nunca se recibe pre-calculado: asi cualquiera puede reconstruirlo desde las `leaves`
  publicadas en el evento sin confiar en la palabra del oracle.
- `leaves` no puede estar vacio; `metadataHash` no puede ser cero.
- El lote queda deduplicado por `vehicleTokenId`, `kind`, `merkleRoot` (el root
  calculado, no uno declarado por el llamante).
- `verifyEvidenceLeaf` es de lectura publica y usa `MerkleProof.verifyCalldata` de
  OpenZeppelin sobre el `merkleRoot` guardado: permite probar sin wallet que una
  evidencia puntual (por ejemplo una autoparte) pertenece a un batch publicado.
- Solo admin, o el oracle original mientras siga activo (`hasRole(ORACLE_ROLE, msg.sender)`),
  puede cambiar el estado de una atestacion o un batch. Si a un oracle se le revoca el
  rol, deja de poder tocar el estado de lo que habia subido antes; solo el admin puede
  hacerlo desde ese momento.

## Seed oracle

`npm run seed:oracle:sepolia`:

- resuelve `CarPass` y `CarPassOracle`;
- verifica que el deployer tenga `ORACLE_ROLE`;
- toma VINs demo;
- sube atestaciones demo si no existen;
- calcula las `leaves` de un lote Merkle demo de autopartes y llama
  `submitEvidenceBatch` con ellas (el root lo calcula el contrato, no el script);
- genera una proof de ejemplo para la primera hoja y llama `verifyEvidenceLeaf`
  on-chain para confirmar en el mismo seed que la verificacion funciona de punta a
  punta;
- no guarda secretos ni documentos.

Para dar de alta un oracle real (VTV, taller, aseguradora) sin usar la wallet
deployer: `npm run grant:oracle:sepolia` con `ORACLE_TARGET_WALLET` en `.env`.

## UX

### Consulta publica

El panel oracle muestra:

- si la evidencia es directa, firmada EIP-712 o batch Merkle;
- oracle emisor;
- tx/procedencia conceptual;
- hashes acortados;
- para batches: recalcula el `merkleRoot` en el navegador a partir de las `leaves`
  publicadas en `EvidenceBatchSubmitted` y muestra si coincide con el root guardado
  on-chain ("N hojas verificadas" o alerta si no coincide/si el evento no aparece),
  sin depender de wallet ni de un indexer.

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
- Lectura publica sin wallet, incluida la verificacion de membership Merkle
  (`verifyEvidenceLeaf` es `view`, no requiere gas ni firma).
- El root de cada batch se deriva on-chain de las `leaves` recibidas; el oracle no
  puede publicar un root arbitrario desconectado de evidencia real.
- Escrituras siguen roleadas; revocar `ORACLE_ROLE` corta tambien la capacidad de
  ese wallet de modificar el estado de sus atestaciones/batches previos.
- No se agregan claves a variables `VITE_`.

## Verificacion permitida

- `npm run compile`
- `npm run export:frontend`
- `npm run registry:sepolia`
- `npm run health:sepolia`
- `npm audit --audit-level=high`
- `git diff --check`

No correr build/lint/e2e/Playwright/frontend audit salvo pedido explicito.
