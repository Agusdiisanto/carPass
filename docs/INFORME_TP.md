# Informe TP Final - CarPass

> Nota operativa: este informe esta preparado para pegarse en Google Docs. Desde este entorno no hay un conector de Google Docs disponible, por lo que no puedo crear el documento directamente en Drive.

## Datos del proyecto

**Proyecto:** CarPass  
**Materia:** Blockchain  
**Repositorio:** https://github.com/Agusdiisanto/carPass  
**Red usada:** Sepolia, chain id `11155111`  
**Contrato principal CarPass:** `0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D`  
**Link al contrato:** https://sepolia.etherscan.io/address/0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D

## Integrantes

- Agustin Di Santo
- Ezequiel Gonzalez
- Andres Mora

## Contexto e introduccion

CarPass nace para resolver un problema comun en la compraventa y mantenimiento de vehiculos usados: la informacion tecnica del auto suele estar fragmentada, depende de papeles o registros privados, y puede ser dificil de verificar por terceros. Esto genera asimetria de informacion entre vendedor, comprador, talleres, aseguradoras e inspecciones tecnicas.

La propuesta es representar cada vehiculo como un NFT ERC-721 asociado a su VIN. Ese NFT funciona como un pasaporte digital del auto. Sobre ese pasaporte se registra un historial tecnico append-only: services, kilometraje, VTV, siniestros, transferencias de titularidad y eventos complementarios. La informacion no se edita ni se borra; se agregan nuevos hitos y el contrato conserva la autoria on-chain de cada operacion.

Ademas, CarPass calcula un sello de calidad consultable publicamente. Cualquier persona puede buscar un vehiculo por VIN y ver su estado sin necesitar wallet, lo que permite validar rapidamente si el auto tiene VTV vigente, service al dia o bloqueantes como una VTV rechazada o un siniestro grave sin reparar.

## Que venimos a resolver

El objetivo principal es aportar trazabilidad verificable al historial vehicular. En un flujo tradicional, un comprador depende de la buena fe del vendedor o de documentos dispersos. Con CarPass, los eventos relevantes quedan vinculados al VIN y firmados por actores con roles especificos.

El sistema busca resolver:

- Falta de historial tecnico confiable para vehiculos usados.
- Posibilidad de alterar, ocultar o duplicar informacion relevante.
- Dificultad para saber si un service fue cargado por un taller autorizado.
- Dificultad para evaluar rapidamente si un auto esta en condiciones aceptables.
- Necesidad de consultar informacion publica sin obligar al usuario final a conectar una wallet.

## Arquitectura general

La solucion se divide en tres capas principales:

| Capa | Tecnologia | Responsabilidad |
| --- | --- | --- |
| Smart contracts | Solidity, Hardhat, OpenZeppelin | NFT vehicular, roles, historial, reglas de consistencia y sello de calidad |
| Frontend DApp | React, Vite, TypeScript, ethers v6 | Consulta publica por VIN, conexion MetaMask y formularios por rol |
| Scripts operativos | Hardhat scripts, Node.js | Deploy, seed de datos demo, export de ABI y health-check de Sepolia |

El contrato principal es `CarPass`. Se modularizo internamente para separar responsabilidades:

- `CarPassVehicleRegistry`: alta de vehiculos, VIN y consultas base.
- `CarPassRoles`: roles y revocacion trazable de wallets.
- `CarPassHistory`: carga de services, siniestros y VTV.
- `CarPassSeal`: calculo del sello de calidad.
- `CarPassTransfers`: restriccion de transferencias owner-only.
- `VehicleParts`: contrato adicional para autopartes grabadas.
- `CarPassOracle`: contrato adicional para atestaciones externas con hashes, EIP-712 y batches Merkle.

## Decisiones tecnicas y de arquitectura

### Usar ERC-721 para representar cada vehiculo

Se eligio ERC-721 porque cada vehiculo es unico. El NFT representa el pasaporte digital del auto y permite usar primitivas estandar como `ownerOf`, `transferFrom` y eventos de transferencia. Esto tambien facilita la integracion con tooling existente del ecosistema Ethereum.

### Derivar el tokenId desde el VIN

El `tokenId` se calcula como `uint256(keccak256(vin))`. Esta decision evita depender de IDs incrementales y permite que cualquier usuario derive deterministicamente el identificador del NFT a partir del VIN. Tambien ayuda a reforzar la unicidad: el mismo VIN siempre apunta al mismo token.

### Historial append-only

Los registros de service, VTV y siniestros se agregan como eventos de historial y no se editan ni eliminan. Esta decision acompana el objetivo de trazabilidad: si hay un error o un cambio de estado, se agrega una nueva entrada en vez de modificar el pasado.

### Roles con AccessControl

No todas las wallets pueden escribir cualquier dato. Se uso `AccessControl` de OpenZeppelin para separar responsabilidades:

| Rol | Puede hacer |
| --- | --- |
| `DEFAULT_ADMIN_ROLE` | Administrar roles |
| `REGISTRADOR_ROLE` | Registrar vehiculos y mintear NFTs |
| `MECANICO_ROLE` | Cargar services |
| `ASEGURADORA_ROLE` | Cargar siniestros |
| `INSPECTOR_VTV_ROLE` | Cargar VTV |
| `ORACLE_ROLE` | Cargar atestaciones externas en el oracle |

El motivo es reducir superficie de abuso: una aseguradora no deberia cargar una VTV y un taller no deberia registrar un siniestro.

### Autoria on-chain con `msg.sender`

El contrato no confia en campos de autoria enviados desde el frontend. Para services, VTV y siniestros, sobrescribe autor y timestamp usando `msg.sender` y `block.timestamp`. Esto evita que un usuario declare manualmente otro taller, inspector o declarante.

### Kilometraje estrictamente creciente

Los services validan que el kilometraje sea mayor al ultimo registrado. Esta regla apunta a detectar inconsistencias como reduccion artificial de kilometraje. Si el valor no crece, el contrato revierte la transaccion.

### Sello de calidad calculado por reglas del contrato

El sello puede quedar en tres estados:

| Estado | Significado |
| --- | --- |
| `ACTIVO` | El vehiculo tiene condiciones vigentes y sin bloqueantes |
| `VENCIDO` | Falta alguna condicion, como VTV o service vigente |
| `REVOCADO` | Hay una condicion grave, como VTV rechazada o siniestro grave sin reparar |

El motivo de esta decision es traducir un historial tecnico potencialmente largo en una senal simple para usuarios no tecnicos, sin ocultar el detalle del historial.

### Consulta publica sin wallet

La app permite consultar por VIN sin conectar MetaMask. Esto se decidio porque el usuario principal de la consulta puede ser un comprador, inspector o persona interesada que solo necesita leer informacion publica. Las operaciones de escritura si requieren wallet y rol.

### Frontend separado del contrato

El frontend vive en `frontend/` y consume ABI/address exportados desde los artifacts del contrato. Esto permite congelar o versionar el ABI antes de construir pantallas dependientes, reduciendo errores entre contrato y DApp.

### Sepolia como red de despliegue

Se eligio Sepolia por ser una testnet ampliamente soportada por wallets, exploradores y proveedores RPC. Permite demostrar transacciones reales sin costos de mainnet.

## Funcionalidades implementadas

- Registro de vehiculos por VIN.
- Mint de NFT ERC-721 para cada vehiculo.
- Consulta publica por VIN.
- Roles para registrador, mecanico, aseguradora e inspector VTV.
- Carga de services con kilometraje creciente.
- Carga de siniestros con gravedad y estado de reparacion.
- Carga de VTV con resultado y vencimiento.
- Transferencia del NFT solo por el propietario directo.
- Revocacion trazable de wallets.
- Sello de calidad calculado desde el historial.
- Autopartes grabadas con contrato `VehicleParts`.
- Atestaciones externas con `CarPassOracle`.
- Frontend con MetaMask, vistas por rol y modo publico.

## Evidencias de blockchain

### Contratos desplegados

| Contrato | Address | Evidencia |
| --- | --- | --- |
| CarPass | `0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D` | https://sepolia.etherscan.io/address/0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D |
| VehicleParts | `0x3d13C42B7a7755Df78189553f2a194c9D289B446` | https://sepolia.etherscan.io/address/0x3d13C42B7a7755Df78189553f2a194c9D289B446 |
| CarPassOracle | `0x2F516df9D6A4059e688Bfe4D1F71110b4FFa67a7` | https://sepolia.etherscan.io/address/0x2F516df9D6A4059e688Bfe4D1F71110b4FFa67a7 |

### Transacciones de deploy versionadas

| Accion | Hash | Bloque | Fecha registrada |
| --- | --- | --- | --- |
| Deploy de VehicleParts | `0x762ec08d33c965e717526ac2d5a492b3b5de4491bbc08b892f857d335dd43f9b` | `11176060` | `2026-06-30T23:49:49.175Z` |
| Deploy de CarPassOracle | `0x7f6f797ba511dedfc82f793d64a2ff1d73de18db9d798f2597414bb64258cb80` | `11218534` | `2026-07-06T23:14:14.051Z` |

Links directos:

- https://sepolia.etherscan.io/tx/0x762ec08d33c965e717526ac2d5a492b3b5de4491bbc08b892f857d335dd43f9b
- https://sepolia.etherscan.io/tx/0x7f6f797ba511dedfc82f793d64a2ff1d73de18db9d798f2597414bb64258cb80

Nota: el artifact versionado de `CarPass` conserva la address final usada por la demo, pero no contiene hash de transaccion ni bloque de deploy. Por eso se informa como evidencia de contrato desplegado mediante address de Sepolia, no como hash de deploy versionado.

### Evidencia de estado sincronizado desde Sepolia

El snapshot publico local fue sincronizado desde Sepolia con:

- Red: `sepolia`
- Chain id: `11155111`
- Contrato: `0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D`
- Bloque sincronizado: `11183607`
- Fecha de sincronizacion: `2026-07-02T01:02:40.578Z`

Vehiculos demo incluidos en la evidencia:

| VIN | Vehiculo | Sello | Motivo |
| --- | --- | --- | --- |
| `1HGBH41JXMN109186` | Honda Civic 2022 | `ACTIVO` | Sello valido |
| `3FADP4EJ8FM123456` | Ford Focus 2020 | `VENCIDO` | Sin VTV registrada |
| `1G1BE5SM1H7123456` | Chevrolet Cruze 2019 | `VENCIDO` | VTV aprobada con observaciones |
| `2T1BURHE0JC043821` | Toyota Corolla 2021 | `REVOCADO` | Siniestro grave sin reparacion registrada |
| `8A1FB1AB2JT123456` | Renault Logan 2018 | `REVOCADO` | VTV rechazada |

## Flujo de uso de la app

1. Un registrador autorizado carga un vehiculo con VIN, marca, modelo, anio, color y propietario inicial.
2. El contrato calcula el `tokenId`, mintea el NFT y guarda los datos base.
3. Talleres, aseguradoras e inspectores VTV cargan eventos segun su rol.
4. El contrato valida reglas, por ejemplo kilometraje creciente y permisos por rol.
5. El usuario publico busca un VIN y ve datos, historial y sello de calidad.
6. Si el vehiculo cambia de titular, el propietario directo puede transferir el NFT.

## Conclusion

CarPass demuestra como blockchain puede usarse para construir trazabilidad verificable en un dominio donde la confianza es importante. La decision de usar NFTs por VIN permite modelar cada vehiculo como un activo unico, mientras que los roles, reglas de validacion y eventos append-only aportan control sobre quien escribe informacion y como queda registrada.

La DApp completa el flujo al permitir operaciones privadas con wallet y consulta publica sin wallet. De esta forma, el sistema no solo registra informacion en blockchain, sino que tambien la vuelve accesible para usuarios finales que necesitan tomar decisiones sobre un vehiculo.
