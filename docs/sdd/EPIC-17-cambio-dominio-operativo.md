# Cambio de Dominio Operativo

## Problema que resuelve

CarPass ya permite transferir el pasaporte vehicular NFT entre wallets, pero la operacion necesita presentarse como un flujo claro de cambio de dominio: identificar el vehiculo, confirmar el titular actual, cargar la wallet compradora y ejecutar la transferencia on-chain sin confundirla con titularidad legal externa.

## Alcance

- Reutilizar el ABI existente de ERC-721: `ownerOf`, `transferFrom`, `vinToTokenId` y evento `Transfer`.
- Mantener el contrato sin cambios y evitar redeploy.
- Mejorar la vista de propietario para operar por listado, VIN manual o QR.
- Mostrar titular actual y trazabilidad basica de transferencias.
- Integrar el flujo con la infraestructura notebook-celular ya definida en EPIC-15: el VIN detectado por QR puede precargar la operacion.
- Sincronizar automaticamente el garaje cuando un NFT se transfiere dentro o fuera de la aplicacion.

No incluye verificacion registral externa, documentacion legal, backend propio ni almacenamiento off-chain.

## Interfaces publicas usadas

### `ownerOf(uint256 tokenId) returns (address)`

Fuente de verdad del titular NFT actual.

### `transferFrom(address from, address to, uint256 tokenId)`

Ejecuta el cambio de propietario NFT. En CarPass solo puede iniciarlo el propietario directo (`msg.sender == from`).

### `vinToTokenId(string calldata vin) returns (uint256)`

Convierte el VIN en `tokenId` para operar desde busqueda manual o QR.

### Evento `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`

Fuente de historial de altas y cambios de propietario.

## Roles autorizados

- Propietario NFT actual: unico autorizado a ejecutar `transferFrom`.
- Admin: puede acceder al modulo de propietario embebido, pero la transaccion sigue dependiendo de que la wallet conectada sea propietaria del NFT.

## Entradas

- Wallet conectada en Sepolia.
- VIN ingresado manualmente, recibido desde companion notebook-celular o escaneado por QR.
- Wallet compradora destino.

## Salidas

- Transferencia on-chain del NFT hacia la wallet compradora.
- Mensaje de resultado de transaccion.
- Actualizacion visual del titular actual.
- Historial basico de eventos `Transfer` del vehiculo.
- Actualizacion automatica de "Mis vehiculos" cuando una transferencia externa cambia el titular.
- Remocion visual del vehiculo si `ownerOf(tokenId)` deja de coincidir con la wallet conectada.

## Errores esperados

- VIN invalido: no permite buscar.
- Vehiculo inexistente: `ownerOf` revierte o no hay propietario.
- Wallet destino invalida: no permite confirmar.
- Wallet destino igual a la actual: no permite confirmar.
- Wallet conectada no propietaria: bloquea la transferencia y muestra el titular actual.
- Red incorrecta: bloquea accion de escritura.
- Error de contrato `TransferenciaSoloPropietario`: mensaje corto de dominio.

## Casos felices y rechazos

- El propietario ve sus vehiculos detectados por eventos on-chain y selecciona uno.
- El propietario busca o escanea un VIN propio y el sistema precarga la operacion.
- El propietario ingresa wallet compradora valida, confirma y MetaMask ejecuta `transferFrom`.
- Si el VIN pertenece a otra wallet, la pantalla muestra el titular y bloquea la transferencia.
- Si el usuario esta en red incorrecta, la pantalla permite revisar informacion pero no escribir.
- Si el usuario transfiere el NFT desde MetaMask u otra wallet fuera de CarPass, el garaje detecta el evento `Transfer`, vuelve a consultar `ownerOf` y deja de mostrar el vehiculo si ya no pertenece a la wallet conectada.
- Si una transferencia externa ocurre mientras el modal de transferencia esta abierto, el modal revalida titularidad y pasa a modo solo lectura si la wallet ya no es propietaria.
- Si el nodo RPC rechaza una lectura de logs por rango demasiado amplio, el frontend debe reintentar por ventanas acotadas antes de mostrar error. La deteccion de flota no debe depender de que el RPC acepte consultar desde genesis en una sola llamada.
- Si no hay bloque de deploy configurado, la deteccion inicial puede tomar candidatos del snapshot publico local y leer solo eventos posteriores al snapshot. Esos candidatos siempre se revalidan con `ownerOf` antes de mostrarse.

## Impacto en frontend y ABI

- No cambia ABI.
- No requiere exportar artifacts nuevos.
- El frontend agrega funciones de lectura de historial `Transfer` y UX de dominio sobre `PropietarioView`.
- La infraestructura EPIC-15 sigue siendo la ruta para operar con celular sin backend.
- La sincronizacion externa no cambia ABI: usa `Transfer` y `ownerOf`.
- La fuente de verdad de pertenencia nunca es el estado local; siempre se decide por `ownerOf(tokenId)`.
- Las lecturas de logs pueden usar MetaMask o RPC publico; las verificaciones posteriores de titularidad e info del vehiculo deben reutilizar el provider que logro leer los eventos cuando este disponible, para evitar mezclar una lectura exitosa con un RPC publico degradado.
- El snapshot publico local solo acelera la lista de candidatos cuando falta `VITE_CARPASS_DEPLOY_BLOCK`; no reemplaza la verificacion on-chain de titularidad.

## Comandos de verificacion

No agregar tests. No ejecutar validaciones frontend salvo pedido explicito del usuario.

Como no hay cambio de contrato, `npm run compile` no es necesario para validar ABI. Si en una iteracion futura se toca contrato, ejecutar:

```bash
npm run compile
```

## Riesgos de seguridad o privacidad

- El VIN y las transferencias son publicos on-chain por diseno.
- El frontend no debe pedir claves privadas ni exponer variables sin prefijo `VITE_`.
- El cambio de dominio CarPass acompana la compraventa, pero no reemplaza la titularidad legal ni documentacion registral fuera de blockchain.
