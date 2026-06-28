# SDD - EPIC-05: Event Logging & Validation Rules

## Problema que resuelve

CarPass necesita que cada hito tecnico escrito por un actor autorizado quede atribuido a su wallet y que el contrato rechace datos incoherentes antes de mutar el historial. En el MVP, el hito funcional es el service: un taller autorizado registra kilometraje y descripcion, y el contrato impide retrocesos o repeticiones de odometro.

## Alcance MVP

- Aplicar validacion de kilometraje monotonicamente creciente a `agregarService`.
- Mantener la autoria del service sobrescribiendo `RegistroService.taller` con `msg.sender`.
- Mantener `timestamp` como `block.timestamp`, ignorando cualquier timestamp enviado por el caller.
- Exponer el ultimo kilometraje aceptado para lecturas simples de frontend/QR.
- Mantener la carga base de siniestro y VTV ya integrada: se guardan append-only, con rol y autoria.
- No implementar reglas avanzadas nuevas para siniestro ni VTV en esta epica; sus reglas de coherencia completas quedan para fase posterior.

## Interfaces publicas

### `agregarService(uint256 tokenId, RegistroService calldata registro)`

Registra un service para un vehiculo existente.

Reglas:

- Caller debe tener `MECANICO_ROLE`.
- `tokenId` debe existir.
- Si no hay kilometraje previo, `registro.kilometraje` debe ser mayor a `0`.
- Si ya existe kilometraje previo, `registro.kilometraje` debe ser estrictamente mayor al ultimo kilometraje registrado.
- El contrato sobrescribe `timestamp` con `block.timestamp`.
- El contrato sobrescribe `taller` con `msg.sender`.
- El registro se agrega al arreglo `_services[tokenId]` y no se edita luego.

### `ultimoKilometrajeRegistrado(uint256 tokenId) returns (uint32)`

Devuelve el ultimo kilometraje aceptado para el vehiculo. Retorna `0` si el vehiculo no tiene services registrados.

### `agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)`

Registra un siniestro para un vehiculo existente.

Reglas implementadas:

- Caller debe tener `REGISTRADOR_ROLE` o `ASEGURADORA_ROLE`.
- `tokenId` debe existir.
- El contrato sobrescribe `timestamp` con `block.timestamp`.
- El contrato sobrescribe `declarante` con `msg.sender`.
- El registro se agrega al arreglo `_siniestros[tokenId]` y no se edita luego.

### `agregarVTV(uint256 tokenId, RegistroVTV calldata registro)`

Registra una revision VTV para un vehiculo existente.

Reglas implementadas:

- Caller debe tener `INSPECTOR_VTV_ROLE`.
- `tokenId` debe existir.
- El contrato sobrescribe `timestamp` con `block.timestamp`.
- El contrato sobrescribe `planta` con `msg.sender`.
- El registro se agrega al arreglo `_vtv[tokenId]` y no se edita luego.

## Roles autorizados

- `MECANICO_ROLE`: unico rol autorizado para registrar services.
- `REGISTRADOR_ROLE` o `ASEGURADORA_ROLE`: roles autorizados para registrar siniestros.
- `INSPECTOR_VTV_ROLE`: rol autorizado para registrar VTV.
- `DEFAULT_ADMIN_ROLE`: puede asignar o revocar `MECANICO_ROLE` via `grantRole` / `revokeRole`.

## Eventos emitidos

Se mantiene el evento existente para evitar churn de ABI innecesario en esta epica:

```solidity
event ServiceAgregado(
    uint256 indexed tokenId,
    uint256 timestamp,
    string tipoServicio
);
```

- `SiniestroAgregado(uint256 indexed tokenId, uint256 timestamp, SiniestroGravedad gravedad)`.
- `VTVAgregada(uint256 indexed tokenId, uint256 timestamp, VTVResultado resultado)`.

La autoria queda disponible en `RegistroService.taller`, `RegistroSiniestro.declarante` y `RegistroVTV.planta` mediante los getters de historial.

## Errores esperados

- `AccessControlUnauthorizedAccount(address account, bytes32 neededRole)`: caller sin `MECANICO_ROLE`.
- `VehiculoNoEncontrado(uint256 tokenId)`: service sobre token inexistente.
- `KilometrajeNoMonotonico(uint32 recibido, uint32 ultimo)`: kilometraje menor o igual al ultimo aceptado, incluyendo `0` para el primer service.

## Casos felices

- Un taller con `MECANICO_ROLE` registra el primer service con kilometraje mayor a `0`.
- Un taller con `MECANICO_ROLE` registra services posteriores con kilometraje mayor al ultimo aceptado.
- Cada service queda guardado con `timestamp = block.timestamp` y `taller = msg.sender`.
- `ultimoKilometrajeRegistrado(tokenId)` refleja el kilometraje del ultimo service aceptado.
- Una aseguradora o registrador autorizado carga siniestros con `declarante = msg.sender`.
- Un inspector VTV autorizado carga revisiones con `planta = msg.sender`.

## Rechazos

- Wallet sin `MECANICO_ROLE` no puede registrar service.
- Vehiculo inexistente no acepta service.
- Primer service con `0` km revierte.
- Service posterior con kilometraje menor o igual al ultimo registrado revierte.

## Impacto en ABI y frontend futuro

- Se agrega el getter publico `ultimoKilometrajeRegistrado(uint256)`.
- Se agrega el custom error `KilometrajeNoMonotonico(uint32,uint32)`.
- No cambia la firma de `agregarService`, `RegistroService` ni `ServiceAgregado`.
- La ABI expone `agregarSiniestro`, `agregarVTV`, `getHistorialSiniestros` y `getHistorialVTV` como historial base.
- El frontend puede leer el ultimo kilometraje antes de enviar una transaccion y mostrar el rechazo de forma anticipada, pero la fuente de verdad sigue siendo el contrato.

## Riesgos de seguridad y privacidad

- El kilometraje y descripcion quedan publicos on-chain igual que el resto del historial.
- La validacion ocurre antes de mutar estado.
- No hay loops nuevos ni dependencias externas.
- Un taller revocado no puede cargar services nuevos, pero sus registros previos siguen visibles y atribuibles.

## Verificacion

No agregar tests. No ejecutar validaciones frontend.

```bash
npm run compile
npm audit --audit-level=high
```
