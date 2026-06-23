# SDD - EPIC-07: Historial Técnico

## Problema que resuelve

Una vez que el NFT de un vehículo está acuñado, su valor radica en la inmutabilidad de su historial técnico. Diferentes actores de la industria necesitan registrar mantenimiento, VTV y siniestros para evitar fraudes como alteraciones de odómetro o siniestros ocultos.

## Interfaces públicas

### Mutadores

1. `agregarService(uint256 tokenId, RegistroService calldata registro)`: permite a un taller mecánico agregar un historial de servicio.
2. `agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)`: permite a una aseguradora o registrador agregar información sobre accidentes.
3. `agregarVTV(uint256 tokenId, RegistroVTV calldata registro)`: permite a una planta inspectora registrar una Verificación Técnica Vehicular.

### Consultas

1. `getHistorialService(uint256 tokenId)`: retorna `RegistroService[]`.
2. `getHistorialSiniestros(uint256 tokenId)`: retorna `RegistroSiniestro[]`.
3. `getHistorialVTV(uint256 tokenId)`: retorna `RegistroVTV[]`.

## Roles autorizados

- `MECANICO_ROLE`: acceso exclusivo a `agregarService`.
- `REGISTRADOR_ROLE` o `ASEGURADORA_ROLE`: acceso a `agregarSiniestro`.
- `INSPECTOR_VTV_ROLE`: acceso a `agregarVTV`.

## Eventos emitidos

- `ServiceAgregado(uint256 indexed tokenId, uint256 timestamp, string tipoServicio)`
- `SiniestroAgregado(uint256 indexed tokenId, uint256 timestamp, SiniestroGravedad gravedad)`
- `VTVAgregada(uint256 indexed tokenId, uint256 timestamp, VTVResultado resultado)`

## Errores esperados

- `VehiculoNoEncontrado(uint256 tokenId)`: se lanza si se intenta agregar un evento a un vehículo no minteado.
- `AccessControlUnauthorizedAccount`: se lanza si el invocador no posee el rol adecuado.

## Seguridad y auditoría

- `timestamp` se sobreescribe con `block.timestamp`.
- `RegistroService.taller`, `RegistroVTV.planta` y `RegistroSiniestro.declarante` se sobreescriben con `msg.sender`.
- Ningún registro histórico se edita ni elimina.

## Impacto en frontend y ABI

- La ABI expone los tres getters de historial y los tres métodos de escritura.
- El frontend puede cruzar los autores (`taller`, `planta`, `declarante`) con `estaRevocado(address)` para marcar registros cargados por wallets revocadas.
