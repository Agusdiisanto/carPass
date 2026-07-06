# Alta Guiada y Rapida con Blockchain

## Problema que resuelve

El alta de concesionaria ya registra el NFT vehicular y luego intenta grabar las
seis autopartes, pero la UI mezcla formulario, resultado y recuperacion. Para
una demo y para uso real, el usuario necesita ver un flujo lineal, saber que
transaccion esta firmando y llegar rapido al pasaporte publico.

## Alcance

- Convertir `RegistradorView` en un flujo guiado de emision on-chain.
- Mostrar pasos visibles: datos, owner, NFT, autopartes y pasaporte publico.
- Calcular el `tokenId` localmente desde el VIN despues del mint confirmado para
  evitar una lectura RPC redundante antes de registrar autopartes.
- Mantener la recuperacion de autopartes pendientes por VIN.
- Mantener el gate de Sepolia y las validaciones on-chain existentes antes de
  firmar autopartes.

No incluye:

- Cambios de ABI.
- Cambios de contrato.
- Tests nuevos.
- Validaciones frontend.

## Interfaces publicas

No cambia ninguna funcion de contrato ni hook publico. Se agrega una utilidad
frontend:

- `vehicleTokenIdFromVin(vin: string): bigint`

## Roles autorizados

No cambian:

- `REGISTRADOR_ROLE`: requerido para `registrarVehiculo` y `registrarPartes`.

## Eventos emitidos

No cambian:

- `VehicleMinted`
- `PartesRegistradas`

## Errores esperados

Se mantienen los errores actuales de `CarPass`, `VehicleParts`, MetaMask y
Sepolia gate. La UI debe mostrarlos como mensajes cortos, sin filtrar detalles
internos.

## Casos felices y rechazos

- Con datos validos, el usuario firma el alta del NFT y luego la transaccion de
  autopartes.
- Si falla autopartes, el NFT queda visible y la UI ofrece reintento sin volver
  a mintear.
- Si el vehiculo ya existe y faltan partes, el panel de recuperacion permite
  completar solo esa transaccion.
- Si la red es incorrecta, no se habilitan escrituras y se informa que debe usar
  Sepolia.

## Impacto en frontend y ABI

Impacto solo frontend:

- `frontend/src/views/RegistradorView.tsx`
- `frontend/src/domain/carpass/idGenerators.ts`
- `frontend/src/App.css`

La ABI no cambia.

## Riesgos de seguridad o privacidad

- Calcular el `tokenId` localmente no reemplaza la confirmacion de la
  transaccion: se usa despues de que `registrarVehiculo` devuelve exito.
- `assertCanRegistrarPartes` sigue validando on-chain estado, rol y contrato
  enlazado antes de pedir firma.
- No se agregan secretos ni variables `VITE_`.

## Verificacion

No ejecutar validaciones frontend salvo pedido explicito.

Verificacion permitida:

```bash
git diff --check
```
