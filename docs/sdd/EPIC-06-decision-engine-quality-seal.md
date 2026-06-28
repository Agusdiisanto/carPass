# SDD - EPIC-06: Decision Engine & Quality Seal

## Problema que resuelve

CarPass necesita diferenciarse de un historial crudo: un comprador debe poder consultar un sello calculado por contrato para entender rapidamente si el vehiculo esta valido, tiene observaciones o no es valido. La consulta debe ser publica y no requerir wallet.

## Alcance de esta implementacion

- Implementar un motor de decision `view` que recorra el historial disponible.
- Devolver estado del sello y motivo legible.
- Reutilizar `SelloEstado` existente para evitar churn innecesario:
  - `ACTIVO`: valido.
  - `VENCIDO`: con observaciones.
  - `REVOCADO`: no valido.
- Mantener `calcularSello(uint256)` como cache opcional que actualiza `_sellos` y emite `SelloActualizado` si cambia.
- No modificar structs de services, VTV ni siniestros.
- No agregar tests en esta epica.

## Interfaces publicas

### `getSelloCalidad(uint256 tokenId) returns (SelloEstado estado, string motivo)`

Calcula el sello en tiempo de lectura y devuelve el motivo asociado.

Reglas, en orden de prioridad:

1. Vehiculo inexistente revierte con `VehiculoNoEncontrado`.
2. Historial de service no monotonicamente creciente devuelve `REVOCADO`.
3. Cualquier VTV rechazada devuelve `REVOCADO`.
4. Cualquier siniestro grave no reparado devuelve `REVOCADO`.
5. Sin VTV registrada devuelve `VENCIDO`.
6. Ultima VTV vencida devuelve `VENCIDO`.
7. Ultima VTV aprobada con observaciones devuelve `VENCIDO`.
8. Sin service registrado devuelve `VENCIDO`.
9. Ultimo service mayor a 365 dias devuelve `VENCIDO`.
10. Si nada anterior aplica, devuelve `ACTIVO`.

### `getSelloEstado(uint256 tokenId) returns (SelloEstado)`

Devuelve solo el estado calculado, para lecturas simples o QR compacto.

### `calcularSello(uint256 tokenId)`

Recalcula el sello y guarda el estado en `_sellos[tokenId]`. Emite `SelloActualizado` solo si el estado cambia.

## Eventos

- `SelloActualizado(uint256 indexed tokenId, SelloEstado nuevoEstado)`.

## Errores esperados

- `VehiculoNoEncontrado(uint256 tokenId)`: consultas sobre vehiculo inexistente.

## Impacto en ABI y frontend

- Se agrega `getSelloCalidad(uint256)` como lectura publica principal.
- `getSelloEstado(uint256)` deja de revertir y pasa a calcular el estado.
- `calcularSello(uint256)` deja de revertir y puede ser llamado por cualquier cuenta para refrescar el cache.
- La interfaz puede mostrar el sello sin pedir wallet si el contrato esta configurado.

## Riesgos de seguridad y privacidad

- La funcion recorre arreglos de historial; para volumenes grandes puede ser costosa si se llama on-chain desde otro contrato. Para frontend/QR como `eth_call` es aceptable en esta fase.
- Los motivos no agregan datos privados; resumen informacion ya publica on-chain.
- La regla de mantenimiento al dia usa una ventana simple de 365 dias desde el ultimo service.

## Verificacion

No ejecutar validaciones frontend.

```bash
npm run compile
npm audit --audit-level=high
```
