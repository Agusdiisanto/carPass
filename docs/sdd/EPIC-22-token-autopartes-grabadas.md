# SDD - EPIC-22: Token de Autopartes Grabadas

## Problema que resuelve

El sistema de grabado de autopartes antirrobo identifica seis piezas criticas del vehiculo (motor, caja de cambios, dos puertas delanteras, capot y baul) con un numero de grabado unico. Hoy CarPass no representa esas piezas: si se cambia el motor, no queda trazabilidad on-chain de que parte se retiro, cual se instalo, quien la instalo ni cuando. Se necesita un contrato nuevo que emita un token por cada autoparte grabada, la asocie al vehiculo (`CarPass.tokenId`) y deje historial inmutable de reemplazos.

## Alcance

- Contrato nuevo `VehicleParts.sol`, independiente de `CarPass.sol`, vinculado por direccion inmutable.
- Reutiliza los roles ya definidos en `CarPass` (`REGISTRADOR_ROLE`, `MECANICO_ROLE`) via llamada cross-contract a `hasRole`. No se duplican roles ni se agrega un sistema de permisos propio.
- Alta de las 6 autopartes de un vehiculo en una sola transaccion, ejecutada por concesionaria (`REGISTRADOR_ROLE`).
- Reemplazo de una autoparte puntual, ejecutado exclusivamente por taller (`MECANICO_ROLE`).
- Historial append-only por tipo de parte: la parte anterior no se borra ni se quema, queda marcada como reemplazada.
- No incluye marketplace ni transferencia libre del token de parte: el NFT de la parte no es un activo comerciable, solo trazabilidad. `transferFrom`/`safeTransferFrom` quedan deshabilitados.
- Incluye integracion frontend minima: alta de las 6 partes desde `RegistradorView` y reemplazo puntual desde `TallerView`, siguiendo el patron de `useCarPass`/`useVehicleLookup` ya existente.

### Las 6 autopartes cubiertas

Orden fijo de `enum TipoParte`: `MOTOR`, `CAJA_CAMBIOS`, `PUERTA_DELANTERA_IZQUIERDA`, `PUERTA_DELANTERA_DERECHA`, `CAPOT`, `BAUL`.

Asuncion documentada: esta lista sigue el criterio habitual del sistema de identificacion de autopartes antirrobo (motor/block, caja de velocidades y paneles con numero de serie propio). Si la catedra/empresa define otra lista oficial, el enum se ajusta sin tocar el resto del modelo.

## Sin cambios requeridos en `CarPass`

Version anterior de esta spec proponia agregar `vehiculoExiste(uint256)` a `CarPassVehicleRegistry.sol`. Se descarto: el `CarPass` real en Sepolia ya estaba desplegado sin esa funcion, y agregarla solo en el codigo fuente sin redeployar dejaba a `VehicleParts.registrarPartes` reventando siempre con "missing revert data" (selector inexistente en el bytecode on-chain).

En vez de eso, `VehicleParts` valida existencia con `ownerOf` (ERC-721 estandar, presente desde el primer deploy de `CarPass`) envuelto en `try/catch`:

```solidity
function _requireVehicleOwner(uint256 vehicleTokenId) private view returns (address owner) {
    try carPass.ownerOf(vehicleTokenId) returns (address result) {
        owner = result;
    } catch {
        revert VehiculoInexistente(vehicleTokenId);
    }
}
```

Esto evita cualquier dependencia de una funcion nueva en `CarPass`, asi que un cambio futuro en `VehicleParts` nunca vuelve a requerir tocar el contrato principal ya desplegado.

## Interfaces publicas (`VehicleParts.sol`)

### `constructor(address carPass_)`

Guarda `carPass_` como `immutable`. Es la unica fuente de roles y de existencia de vehiculo.

### `registrarPartes(uint256 vehicleTokenId, string[6] calldata numerosGrabado) returns (uint256[6] memory partTokenIds)`

Mintea las 6 autopartes iniciales de un vehiculo. Solo `REGISTRADOR_ROLE` en `CarPass`.

Reglas:

- `vehicleTokenId` debe existir en `CarPass` (`ownerOf` no revierte).
- El vehiculo no puede tener partes registradas previamente.
- Cada `numeroGrabado` debe ser no vacio.
- `partTokenId` por parte = `uint256(keccak256(abi.encodePacked(vehicleTokenId, tipo, numeroGrabado)))`.
- El owner ERC-721 de cada parte se fija en `IERC721(carPass).ownerOf(vehicleTokenId)` al momento del mint.

### `reemplazarParte(uint256 vehicleTokenId, TipoParte tipo, string calldata nuevoNumeroGrabado) returns (uint256 nuevoPartTokenId)`

Reemplaza la parte activa de un tipo. Solo `MECANICO_ROLE` en `CarPass`.

Reglas:

- El vehiculo debe tener partes registradas (`registrarPartes` ya ejecutado).
- `nuevoNumeroGrabado` no vacio.
- La parte activa anterior queda marcada `reemplazada = true` (no se quema, no se pisa).
- Se mintea un nuevo token para el mismo `tipo` con el nuevo numero de grabado.
- Si el `numeroGrabado` ya fue usado antes para ese vehiculo+tipo (mismo `partTokenId` ya existente), revierte: una pieza retirada no puede reinstalarse con el mismo numero de serie.

### Consultas

- `getParteActual(uint256 vehicleTokenId, TipoParte tipo) returns (Parte memory)`
- `getPartesVehiculo(uint256 vehicleTokenId) returns (Parte[6] memory)`
- `getHistorialParte(uint256 vehicleTokenId, TipoParte tipo) returns (Parte[] memory)`

### `struct Parte`

```solidity
struct Parte {
    uint256   vehicleTokenId;
    TipoParte tipo;
    string    numeroGrabado;
    uint256   timestamp;
    address   instalador;   // msg.sender al momento de instalar/reemplazar
    bool      reemplazada;
}
```

## Roles autorizados

- `REGISTRADOR_ROLE` (verificado contra `CarPass`): unico autorizado a `registrarPartes`.
- `MECANICO_ROLE` (verificado contra `CarPass`): unico autorizado a `reemplazarParte`.
- No hay rol de administracion propio en `VehicleParts`; toda la gestion de roles sigue centralizada en `CarPass`.

## Eventos emitidos

```solidity
event PartesRegistradas(
    uint256 indexed vehicleTokenId,
    address indexed registrador,
    uint256         timestamp
);

event ParteReemplazada(
    uint256   indexed vehicleTokenId,
    TipoParte indexed tipo,
    uint256           parteAnteriorTokenId,
    uint256           nuevoPartTokenId,
    address           taller,
    uint256           timestamp
);
```

## Errores esperados

- `VehiculoInexistente(uint256 vehicleTokenId)`: el `vehicleTokenId` no existe en `CarPass`.
- `PartesYaRegistradas(uint256 vehicleTokenId)`: ya se ejecuto `registrarPartes` para ese vehiculo.
- `PartesNoRegistradas(uint256 vehicleTokenId)`: se intenta reemplazar antes del alta inicial.
- `NumeroGrabadoInvalido()`: numero de grabado vacio.
- `RolInsuficiente(address caller, bytes32 role)`: `msg.sender` no tiene el rol requerido en `CarPass`.
- Error nativo de `_safeMint` si el `partTokenId` calculado ya existe (reuso de numero de grabado).
- `TransferenciaNoPermitida()`: intento de `transferFrom`/`safeTransferFrom` sobre un token de parte.

## Casos felices y rechazos / Criterios de aceptacion

- Concesionaria con `REGISTRADOR_ROLE` registra las 6 partes de un vehiculo existente: se mintean 6 tokens, se emite `PartesRegistradas`.
- Repetir `registrarPartes` sobre el mismo vehiculo revierte con `PartesYaRegistradas`.
- Registrar partes de un `vehicleTokenId` inexistente revierte con `VehiculoInexistente`.
- Taller con `MECANICO_ROLE` reemplaza `MOTOR`: la parte previa queda `reemplazada = true`, se mintea token nuevo, se emite `ParteReemplazada`.
- Una cuenta sin `MECANICO_ROLE` no puede reemplazar partes (`RolInsuficiente`).
- Reemplazar una parte de un vehiculo sin alta previa revierte con `PartesNoRegistradas`.
- `getHistorialParte` devuelve todas las instancias (original + reemplazos) en orden cronologico para un tipo de parte.
- Cualquier intento de `transferFrom`/`safeTransferFrom` sobre un token de parte revierte con `TransferenciaNoPermitida`.

## Impacto en ABI y frontend

- Nuevo contrato, nuevo ABI: `scripts/export-frontend-artifacts.mjs` se extendio para exportar tambien `vehiclePartsAbi.ts` y `vehiclePartsDeployment.ts`, ademas de los archivos de `CarPass`.
- No afecta el ABI ni el comportamiento existente de `CarPass`: no se le agrego ni se le quito ninguna funcion.
- Frontend: `frontend/src/hooks/useVehicleParts.ts` (espejo de `useCarPass.ts`), `frontend/src/domain/carpass/vehicleParts.ts` (enum `TIPOS_PARTE` y normalizacion del struct `Parte`) y `frontend/src/domain/carpass/errors.ts` extendido con `parseVehiclePartsError`.
- `RegistradorView`: al registrar un vehiculo se mintean automaticamente las 6 autopartes en la misma accion (sin paso manual), con numeros de grabado autogenerados (`idGenerators.ts`).
- `TallerView`: panel para reemplazar una autoparte del vehiculo ya identificado (`reemplazarParte`), reutilizando el mismo lookup que el alta de service, con numero de grabado autogenerado.
- `PublicView`: `VehiclePartsStatusDiagram` muestra un auto generico en verde (autopartes originales), amarillo (alguna reemplazada) o gris (sin registrar) para el vehiculo consultado.

## Riesgos y decisiones

- El owner ERC-721 de cada token de parte se fija una sola vez al mintear y no se sincroniza automaticamente si el vehiculo cambia de dueño en `CarPass`. El campo `ownerOf` del token de parte es informativo, no la fuente de verdad: la fuente de verdad es el mapeo `vehicleTokenId -> Parte`. Se documenta para evitar asumir que `ownerOf` de una parte refleja el dueño actual del vehiculo.
- Acoplar `VehicleParts` a la direccion de `CarPass` por `immutable` evita duplicar roles, pero implica que un redeploy de `CarPass` (EPIC-08) requiere tambien redeployar `VehicleParts` y volver a dar de alta las partes existentes. Se acepta este costo porque el proyecto ya esta en fase de cierre y un redeploy de `CarPass` es un evento raro y documentado.
- El numero de grabado queda publico on-chain, igual que el VIN en `CarPass`, por diseno de trazabilidad.
- No se valida formato del numero de grabado mas alla de no-vacio; normalizacion especifica del estandar de grabado queda fuera de esta epica.

## Verificacion

No agregar tests salvo pedido explicito. No ejecutar validaciones frontend (build/lint/e2e) salvo pedido explicito.

```bash
npm run compile
npm run export:frontend
```

## Estado de deploy

Desplegado en Sepolia: `VehicleParts` en `0x3d13C42B7a7755Df78189553f2a194c9D289B446`, enlazado a `CarPass` `0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D` (verificado on-chain via `carPass()`). Detalle operativo en `docs/DEPLOY.md`.

Flujo completo verificado on-chain (registrarVehiculo -> registrarPartes -> reemplazarParte) con el deployer, que ya tiene `REGISTRADOR_ROLE` y `MECANICO_ROLE` en `CarPass`. No hace falta otorgar roles nuevos para wallets que ya operan `CarPass`.

### Incidente de deploy resuelto

El primer deploy (`0xAfBcC113fB1305efEAf9D8DA26f499dC0b589e15`) quedo inutilizable: `registrarPartes` llamaba a `carPass.vehiculoExiste(...)`, una funcion que solo existia en el codigo fuente local de `CarPass`, nunca desplegada on-chain. Toda llamada a `registrarPartes` revertia con "missing revert data" (selector inexistente), por lo que ningun vehiculo llegaba a tener autopartes y la UI mostraba "Autopartes no registradas todavia" siempre. Se corrigio reemplazando esa dependencia por `ownerOf` + `try/catch` (ver seccion "Sin cambios requeridos en CarPass") y se redeployo solo `VehicleParts`.
