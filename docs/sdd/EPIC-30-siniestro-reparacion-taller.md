# SDD - EPIC-30: Responsabilidad de reparacion en el taller

## Problema que resuelve

Hoy `AseguradoraView` pide marcar "el vehiculo ya fue reparado" en el mismo momento en que se declara el siniestro. Eso es incorrecto operativamente: la aseguradora declara el siniestro, no ejecuta ni certifica la reparacion. Quien repara el vehiculo y reemplaza autopartes es el taller (`MECANICO_ROLE`), asi que la confirmacion de reparacion y el detalle de que autoparte se cambio deben vivir en `TallerView`, no en el formulario de la aseguradora.

## Alcance

- `AseguradoraView`: eliminar el checkbox "El vehiculo ya fue reparado". El campo `reparado` de `RegistroSiniestro` se sigue enviando en la transaccion (no se puede quitar sin cambiar el struct/ABI y sin redeployar `CarPass`), pero ahora se envia siempre en `false` porque el siniestro recien declarado nunca esta reparado en el momento de la carga.
- `AseguradoraView`: agregar un indicador opcional "Se vio afectada una autoparte grabada" con selector de `TipoParte` (reusa `TIPOS_PARTE`). No es un campo nuevo del contrato: se antepone como texto legible a `descripcion` (ej. `"Autoparte afectada: Motor. " + descripcion`), quedando igual de inmutable on-chain que el resto del relato del siniestro.
- `TallerView`: fusionar el panel separado "Reemplazo de autoparte grabada" dentro del panel de carga de service, como un checkbox "Se cambio una autoparte en este service". Al tildarlo se muestran los campos ya existentes (tipo de parte, numero de grabado autogenerado) dentro del mismo paso.
- Al registrar el service con el checkbox tildado, se ejecutan dos transacciones encadenadas en la misma accion de UI: `agregarService` (con la descripcion incluyendo la nota de reemplazo) y luego `reemplazarParte` sobre `VehicleParts`. Si `agregarService` falla, no se llama `reemplazarParte`. Si `reemplazarParte` falla despues de un `agregarService` exitoso, el service queda registrado igual y el error de autopartes se muestra por separado (no revierte el service).
- No se modifica ningun contrato (`CarPass.sol`, `contracts/core/*.sol`, `VehicleParts.sol`). No hay cambios de ABI, roles ni eventos.
- No se agregan tests.
- `PublicView` (linea de tiempo publica): el badge "Sin reparar"/"Reparado" de cada siniestro deja de leer unicamente el campo on-chain `reparado` (que ahora queda siempre en `false` para siniestros reales, ver riesgo abajo) y cruza, solo a nivel UI, la autoparte declarada afectada contra el estado actual de `VehicleParts`. Si la aseguradora escribio "Autoparte afectada: X" y esa autoparte fue reemplazada (`reemplazada = true`) con fecha posterior a la del siniestro, la UI muestra "Reparado" aunque el campo on-chain del siniestro siga en `false`.

## Interfaces publicas

No hay funciones nuevas en el contrato. Se reusan sin cambios de firma:

- `agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)`: `AseguradoraView` ahora siempre arma `registro.reparado = false`.
- `agregarService(uint256 tokenId, RegistroService calldata registro)`: `TallerView` compone `registro.descripcion` incluyendo la nota de reemplazo de autoparte cuando corresponde.
- `reemplazarParte(uint256 vehicleTokenId, TipoParte tipo, string calldata nuevoNumeroGrabado)` (`VehicleParts`): se invoca desde el mismo panel de service en vez de un panel aparte.

## Roles autorizados

Sin cambios: `ASEGURADORA_ROLE` sigue siendo el unico que puede llamar `agregarSiniestro`; `MECANICO_ROLE` sigue siendo el unico que puede llamar `agregarService` y `reemplazarParte`.

## Eventos emitidos

Sin cambios: `SiniestroAgregado`, `ServiceAgregado`, `ParteReemplazada`.

## Errores esperados

Sin cambios de contrato. En frontend, si `reemplazarParte` falla luego de un `agregarService` exitoso, se muestra el mensaje de error de `VehicleParts` sin marcar el service como fallido.

## Casos felices y rechazos / Criterios de aceptacion

- La vista de aseguradora ya no muestra ningun control para marcar "reparado".
- Toda transaccion `agregarSiniestro` disparada desde `AseguradoraView` llega al contrato con `reparado = false`.
- Si la aseguradora marca "se vio afectada una autoparte", la descripcion on-chain del siniestro incluye el nombre de esa autoparte.
- La vista de taller no tiene un panel separado de reemplazo de autopartes; el control vive dentro del panel de carga de service.
- Si el mecanico tilda "se cambio una autoparte" y el vehiculo no tiene las 6 autopartes registradas, el checkbox queda deshabilitado con el mismo aviso que ya existia.
- Registrar un service con el checkbox tildado ejecuta `agregarService` y despues `reemplazarParte`; la descripcion del service incluye que autoparte se cambio y con que numero de grabado.
- Si `agregarService` falla, no se intenta `reemplazarParte`.
- Si `reemplazarParte` falla, el service ya confirmado se mantiene y el error de autopartes se muestra aparte (via `VehiclePartsOperationNotice` en el footer de `TallerView`).
- Si un siniestro declara "Autoparte afectada: Capot" y despues el taller reemplaza el Capot (fecha posterior), la vista publica muestra ese siniestro como "Reparado" en el timeline.
- Si el taller reemplaza una autoparte distinta a la declarada afectada, o la reemplaza con fecha anterior al siniestro, el timeline sigue mostrando "Sin reparar" para ese siniestro.

## Impacto en ABI y frontend

- Sin impacto en ABI: no se toca `carpassAbi.ts` ni `vehiclePartsAbi.ts`.
- `AseguradoraView.tsx`: quita el estado y el campo de UI `reparado`; agrega estado local `autoparteAfectada` / `tipoParteAfectada` que solo afecta el texto de `descripcion` antes de enviar la transaccion.
- `TallerView.tsx`: fusiona el estado y los campos de `reemplazarParte` (ya existentes) dentro del flujo de `handleService`; agrega `VehiclePartsOperationNotice` al footer para dar feedback de tx del reemplazo.
- No se toca `useCarPass.ts` ni `useVehicleParts.ts`: ambos hooks ya aceptan los parametros necesarios.
- `domain/carpass/vehicleParts.ts`: agrega `parseAutoparteAfectada(descripcion)` y `siniestroFueReparado(siniestro, partes)`, ambas funciones puras de UI (sin llamadas a contrato).
- `PublicView.tsx`: agrega una lectura propia de `getPartesVehiculo(tokenId)` (mismo patron que `VehiclePartsViewer`) para poder cruzar cada siniestro contra el estado de autopartes al construir el timeline. Se invalida con el mismo `partsRefreshKey` que ya dispara el refresco del diagrama de autopartes.

## Riesgos y decisiones

- **Impacto en el sello de calidad (EPIC-06, regla 4):** hoy la unica forma de que `reparado` sea `true` en produccion era que la aseguradora lo tildara al declarar el siniestro. Al fijar `reparado = false` siempre desde `AseguradoraView`, cualquier siniestro `GRAVE` cargado por el flujo real de UI queda con `reparado = false` para siempre (no existe una funcion de contrato para actualizar un siniestro ya cargado; el historial es append-only). Consecuencia: todo siniestro grave declarado desde ahora revoca el sello de forma permanente segun `getSelloCalidad`, sin mecanismo de reversion. Se acepta esto conscientemente porque:
  - Agregar una funcion de "marcar siniestro reparado" requeriria cambiar `CarPassTypes.sol`/`CarPassHistory.sol` (nueva funcion o campo mutable) y evaluar re-deploy, lo cual el proyecto esta evitando activamente en esta fase de cierre (ver riesgos documentados en EPIC-22 sobre el costo de redeployar `CarPass`).
  - El dato semantico real (que autoparte se cambio y cuando) ya queda registrado igual de forma verificable en `VehicleParts` via `reemplazarParte`/`ParteReemplazada`, que es justamente la fuente de verdad de reparacion fisica que pedia esta epica.
  - `scripts/seed.ts` puede seguir usando `reparado: true` directamente contra el contrato para escenarios de demo (`EPIC-29`) sin pasar por `AseguradoraView`; no se modifica el seed en esta epica.
- El texto "Autoparte afectada: X" en la descripcion del siniestro y "Autoparte reemplazada: X (numero)" en la del service son convenciones de UI, no campos estructurados; quedan on-chain como parte de `descripcion` (string libre), igual que el resto del relato de cada registro.
- No se agrega ninguna validacion nueva de coherencia entre el siniestro declarado por la aseguradora y el reemplazo posterior hecho por el taller (por ejemplo, no se valida que la autoparte marcada como afectada sea la misma que despues se reemplaza). Se documenta como limitacion conocida, no como bug: el contrato no vincula siniestros con reemplazos de autopartes.
- El cruce "Reparado" del timeline publico es puramente de presentacion (front-end, `eth_call` de lectura), no cambia el campo `reparado` on-chain del siniestro ni el resultado de `getSelloCalidad`. Es intencional una divergencia visible: el timeline puede mostrar "Reparado" para un siniestro grave mientras el sello de calidad de ese mismo vehiculo sigue en `REVOCADO`, porque el motor de decision (`EPIC-06`) solo lee el campo on-chain, no el cruce de UI. Si se quiere que el sello tambien se recupere, hace falta la funcion de contrato descartada en el punto anterior.

## Verificacion

No agregar tests. No ejecutar validaciones frontend salvo pedido explicito del usuario.

```bash
npm run compile
```
