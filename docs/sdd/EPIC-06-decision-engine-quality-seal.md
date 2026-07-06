# Decision Engine & Quality Seal

## Problema que resuelve

CarPass necesita diferenciarse de un historial crudo: un comprador debe poder consultar un sello calculado por contrato para entender rapidamente si el vehiculo esta valido, tiene observaciones o no es valido. La consulta debe ser publica y no requerir wallet.

## Alcance de esta implementacion

- Implementar un motor de decision `view` que recorra el historial disponible.
- Devolver estado del sello y motivo legible.
- Reutilizar `SelloEstado` existente para evitar churn innecesario:
  - `ACTIVO`: valido.
  - `VENCIDO`: con observaciones.
  - `REVOCADO`: no valido.
- No agregar tests en este modulo.

### Actualizacion (hardening de gas, 2026-07-03)

- Se elimino `calcularSello(uint256)`, el evento `SelloActualizado` y el mapping `_sellos`. La cache nunca era leida por ningun getter (`getSelloEstado`/`getSelloCalidad` siempre recalculan desde `_calcularSello`), asi que la funcion solo gastaba una SSTORE y un evento para poblar una variable muerta. Cambio de ABI: se eliminan `calcularSello` y el evento `SelloActualizado` de la interfaz publica. Confirmado que ningun consumidor de frontend los usaba (`grep` sobre `frontend/src` solo encontraba el ABI generado).

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

Devuelve solo el estado calculado, para lecturas publicas simples.

## Eventos

- Ninguno propio de este modulo. `calcularSello(uint256)` y `SelloActualizado` se eliminaron (ver "Actualizacion" arriba): no habia getter que leyera la cache que escribian.

## Errores esperados

- `VehiculoNoEncontrado(uint256 tokenId)`: consultas sobre vehiculo inexistente.

## Impacto en ABI y frontend

- Se agrega `getSelloCalidad(uint256)` como lectura publica principal.
- `getSelloEstado(uint256)` deja de revertir y pasa a calcular el estado.
- La interfaz puede mostrar el sello sin pedir wallet si el contrato esta configurado.

## Riesgos de seguridad y privacidad

- La funcion recorre arreglos de historial; para volumenes grandes puede ser costosa si se llama on-chain desde otro contrato. Para frontend como `eth_call` es aceptable en esta fase.
- Los motivos no agregan datos privados; resumen informacion ya publica on-chain.
- La regla de mantenimiento al dia usa una ventana simple de 365 dias desde el ultimo service.

## Verificacion

No ejecutar validaciones frontend.

```bash
npm run compile
npm audit --audit-level=high
```
