# SDD - EPIC-04: Historial Técnico

## Problema que resuelve
Una vez que el NFT de un vehículo está acuñado (EPIC-03), su valor radica en la inmutabilidad de su historial técnico. Diferentes actores de la industria necesitan registrar el mantenimiento y los eventos que sufre el auto a lo largo de su vida, para evitar fraudes (ej. alteraciones de odómetro o siniestros ocultos).

## Interfaces Públicas

### Mutadores (Escritura)
1. **`agregarService(uint256 tokenId, RegistroService calldata registro)`**: Permite a un taller mecánico agregar un historial de servicio (tipo de servicio, kilometraje actual, descripción).
2. **`agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)`**: Permite a un asegurador / registrador agregar información sobre accidentes, incluyendo gravedad y estado de reparación.
3. **`agregarVTV(uint256 tokenId, RegistroVTV calldata registro)`**: Permite a una planta inspectora registrar un resultado de Verificación Técnica Vehicular y su fecha de expiración.

### Consultas (Lectura)
1. **`getHistorialService(uint256 tokenId)`**: Retorna array `RegistroService[]`.
2. **`getHistorialSiniestros(uint256 tokenId)`**: Retorna array `RegistroSiniestro[]`.
3. **`getHistorialVTV(uint256 tokenId)`**: Retorna array `RegistroVTV[]`.

## Roles Autorizados
- **`MECANICO_ROLE`**: Acceso exclusivo a `agregarService`.
- **`REGISTRADOR_ROLE`**: Acceso a `agregarSiniestro`.
- **`INSPECTOR_VTV_ROLE`**: Acceso a `agregarVTV`.

## Eventos Emitidos
- `ServiceAgregado(uint256 indexed tokenId, uint256 timestamp, string tipoServicio)`
- `SiniestroAgregado(uint256 indexed tokenId, uint256 timestamp, SiniestroGravedad gravedad)`
- `VTVAgregada(uint256 indexed tokenId, uint256 timestamp, VTVResultado resultado)`

## Errores Esperados
- **`VehiculoNoEncontrado(uint256 tokenId)`**: Se lanza si se intenta agregar un evento a un vehículo (`tokenId`) que aún no ha sido minteado (cuyo owner es `address(0)`).
- **AccessControlUnauthorizedAccount**: Se lanza nativamente si el invocador no posee el rol adecuado.

## Seguridad y Auditoría (Tiempos y Autores)
Para garantizar la validez forense de los registros:
- El `timestamp` de cada struct es sobreescrito en el contrato por `block.timestamp`. No se confía en el tiempo del cliente.
- Las addresses auditoras (`taller` y `planta`) son sobreescritas por `msg.sender`. Ningún usuario con rol puede cargar un dato "a nombre de otro".

## Impacto en Frontend y ABI
- La ABI se expandirá con los 3 getters listos para iterar arrays, y 3 métodos de escritura.
- El frontend debe saber que no hace falta enviar `timestamp`, `taller` ni `planta` correctos en la transacción, porque el contrato los pisará de igual manera (pueden enviarse en 0 para ahorrar calldata).
