# Contrato CarPass en Sepolia

## Resumen

CarPass es el contrato principal del proyecto. Esta desplegado en Sepolia como
un ERC-721: cada vehiculo existe como un NFT unico asociado a su VIN. El NFT
funciona como un pasaporte digital del auto y el contrato guarda historial
tecnico append-only: services, VTV, siniestros, transferencias y revocacion de
actores.

La direccion versionada para la demo es:

```text
0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D
```

Red:

```text
Sepolia, chain id 11155111
```

El frontend usa esta address desde `frontend/src/contracts/carpassDeployment.ts`
y puede sobreescribirla localmente con `VITE_CARPASS_CONTRACT_ADDRESS`.

## Que representa el NFT

El contrato hereda de `ERC721` y crea tokens con nombre `CarPass` y simbolo
`CPASS`. Cada token representa un vehiculo.

El identificador del token no es incremental. Se calcula de forma deterministica
a partir del VIN:

```text
tokenId = uint256(keccak256(vin))
```

Esto permite que cualquier persona convierta un VIN en su `tokenId` con
`vinToTokenId(vin)` y luego consulte el historial publico sin necesitar una
wallet operativa.

Reglas del VIN:

- Debe tener exactamente 17 caracteres.
- No puede registrarse dos veces.
- Si el VIN ya existe, el contrato revierte con `VehiculoYaRegistrado`.
- Si el VIN no tiene longitud valida, revierte con `VinInvalido`.

## Roles del sistema

CarPass usa `AccessControl` de OpenZeppelin. No todas las wallets pueden escribir
historial: cada accion sensible requiere un rol.

| Rol | Para que sirve |
| --- | --- |
| `DEFAULT_ADMIN_ROLE` | Administra roles con `grantRole` y `revokeRole`. |
| `REGISTRADOR_ROLE` | Registra vehiculos nuevos y mintea el NFT inicial. |
| `MECANICO_ROLE` | Carga registros de service. |
| `ASEGURADORA_ROLE` | Carga registros de siniestros. |
| `INSPECTOR_VTV_ROLE` | Carga registros de VTV. |

El deployer recibe automaticamente `DEFAULT_ADMIN_ROLE` y
`REGISTRADOR_ROLE` en el constructor.

## Alta de vehiculos

La funcion principal para crear un vehiculo es:

```text
registrarVehiculo(VehiculoInfo info, address propietarioInicial)
```

Solo puede ejecutarla una wallet con `REGISTRADOR_ROLE`.

Guarda estos datos:

- VIN.
- Marca.
- Modelo.
- Anio.
- Color.
- Propietario inicial del NFT.

Cuando se registra correctamente:

- Calcula el `tokenId` desde el VIN.
- Mintea el NFT al `propietarioInicial`.
- Guarda los datos base del vehiculo.
- Emite el evento `VehicleMinted`.

## Historial tecnico

El contrato guarda tres tipos de historial. Todos son append-only: se agregan
registros nuevos, pero no se editan ni eliminan los anteriores.

### Services

La funcion es:

```text
agregarService(uint256 tokenId, RegistroService registro)
```

Solo puede ejecutarla una wallet con `MECANICO_ROLE`.

Cada service guarda:

- Timestamp on-chain.
- Tipo de servicio.
- Kilometraje.
- Taller que lo cargo.
- Descripcion.

El contrato no confia en el timestamp ni en el taller enviados por el usuario.
Los sobrescribe con:

```text
timestamp = block.timestamp
taller = msg.sender
```

Regla clave: el kilometraje debe ser estrictamente creciente. Si se intenta
cargar un kilometraje menor o igual al ultimo aceptado, revierte con:

```text
KilometrajeNoMonotonico(recibido, ultimo)
```

### Siniestros

La funcion es:

```text
agregarSiniestro(uint256 tokenId, RegistroSiniestro registro)
```

Solo puede ejecutarla una wallet con `ASEGURADORA_ROLE`.

Cada siniestro guarda:

- Timestamp on-chain.
- Gravedad: `LEVE`, `MODERADO` o `GRAVE`.
- Descripcion.
- Si fue reparado.
- Costo estimado.
- Declarante.

El contrato sobrescribe:

```text
timestamp = block.timestamp
declarante = msg.sender
```

### VTV

La funcion es:

```text
agregarVTV(uint256 tokenId, RegistroVTV registro)
```

Solo puede ejecutarla una wallet con `INSPECTOR_VTV_ROLE`.

Cada VTV guarda:

- Timestamp on-chain.
- Resultado: `APROBADO`, `APROBADO_CON_OBSERVACIONES` o `RECHAZADO`.
- Fecha de vencimiento.
- Planta o inspector que la cargo.

El contrato sobrescribe:

```text
timestamp = block.timestamp
planta = msg.sender
```

## Transferencias del vehiculo

El NFT se puede transferir, pero con una restriccion importante: solo el
propietario directo puede iniciar la transferencia.

Aunque ERC-721 permite aprobados y operadores, CarPass bloquea transferencias
iniciadas por terceros. Si `msg.sender` no coincide con `from`, revierte con:

```text
TransferenciaSoloPropietario(caller, tokenId)
```

Esto mantiene el pasaporte digital bajo control explicito del propietario del
vehiculo.

## Revocacion de wallets

El contrato extiende `revokeRole` para dejar trazabilidad adicional.

Cuando el admin revoca un rol:

- Se ejecuta la revocacion normal de OpenZeppelin.
- Si la wallet tenia ese rol, se guarda `revocadoEn[wallet] = block.timestamp`.
- Se emite `WalletRevocada`.

La revocacion no borra historial previo. Si un taller cargo un service antes de
ser revocado, ese registro sigue existiendo y conserva su autor original. La DApp
puede consultar `estaRevocado(wallet)` para mostrar advertencias sobre actores
revocados.

## Sello de calidad

El contrato calcula un sello del vehiculo con tres estados:

| Estado | Significado |
| --- | --- |
| `ACTIVO` | El historial no tiene bloqueantes, hay VTV vigente y service al dia. |
| `VENCIDO` | Falta una condicion de vigencia, pero no hay un bloqueo grave. |
| `REVOCADO` | Existe una condicion grave: VTV rechazada, siniestro grave sin reparar o historial inconsistente. |

Funciones disponibles:

```text
getSelloEstado(tokenId)
getSelloCalidad(tokenId)
calcularSello(tokenId)
```

`getSelloCalidad` devuelve el estado y un motivo legible. `calcularSello`
actualiza el cache interno `_sellos` y emite `SelloActualizado` si el estado
cambio. Las lecturas publicas calculan el estado actual aunque no se haya llamado
a `calcularSello`.

Reglas principales:

- Si el vehiculo no existe, revierte con `VehiculoNoEncontrado`.
- Si el historial de services tiene kilometraje no monotonico, el sello queda
  `REVOCADO`.
- Si alguna VTV esta `RECHAZADO`, el sello queda `REVOCADO`.
- Si hay un siniestro `GRAVE` sin reparar, el sello queda `REVOCADO`.
- Si no hay VTV registrada, queda `VENCIDO`.
- Si la ultima VTV esta vencida, queda `VENCIDO`.
- Si la ultima VTV fue aprobada con observaciones, queda `VENCIDO`.
- Si no hay service registrado, queda `VENCIDO`.
- Si el ultimo service tiene mas de 365 dias, queda `VENCIDO`.
- Si nada de lo anterior aplica, queda `ACTIVO`.

## Consultas publicas

Estas funciones son `view` o `pure`, por lo que cualquier usuario o frontend
puede llamarlas sin firmar transacciones:

| Funcion | Devuelve |
| --- | --- |
| `vinToTokenId(vin)` | Token deterministico asociado al VIN. |
| `getVehiculoInfo(tokenId)` | Datos base del vehiculo. |
| `getHistorialService(tokenId)` | Lista de services. |
| `getHistorialSiniestros(tokenId)` | Lista de siniestros. |
| `getHistorialVTV(tokenId)` | Lista de VTV. |
| `getSelloEstado(tokenId)` | Estado del sello. |
| `getSelloCalidad(tokenId)` | Estado y motivo del sello. |
| `ownerOf(tokenId)` | Propietario actual del NFT. |
| `hasRole(role, wallet)` | Si una wallet tiene un rol. |
| `estaRevocado(wallet)` | Si una wallet fue revocada alguna vez. |

La consulta publica por VIN del frontend se apoya en este flujo:

1. Recibe un VIN.
2. Llama `vinToTokenId(vin)`.
3. Consulta datos, historiales y sello con ese `tokenId`.
4. Muestra la fuente de lectura: Sepolia live, snapshot Sepolia o demo local.

## Eventos importantes

| Evento | Cuando se emite |
| --- | --- |
| `VehicleMinted` | Al registrar un vehiculo y mintear su NFT. |
| `ServiceAgregado` | Al cargar un service valido. |
| `SiniestroAgregado` | Al cargar un siniestro. |
| `VTVAgregada` | Al cargar una VTV. |
| `SelloActualizado` | Al recalcular y cambiar el sello cacheado. |
| `WalletRevocada` | Al revocar un rol y dejar timestamp on-chain. |
| `Transfer` | Evento ERC-721 estandar al mintear o transferir el NFT. |
| `RoleGranted` / `RoleRevoked` | Eventos estandar de AccessControl. |

## Datos demo esperados en Sepolia

El seed del proyecto carga VINs de defensa de forma idempotente. La demo espera
estos resultados:

| VIN | Vehiculo | Sello esperado | Motivo |
| --- | --- | --- | --- |
| `1HGBH41JXMN109186` | Honda Civic 2022 | `ACTIVO` | VTV vigente y services cargados. |
| `3FADP4EJ8FM123456` | Ford Focus 2020 | `VENCIDO` | Sin VTV registrada. |
| `1G1BE5SM1H7123456` | Chevrolet Cruze 2019 | `VENCIDO` | VTV aprobada con observaciones. |
| `2T1BURHE0JC043821` | Toyota Corolla 2021 | `REVOCADO` | Siniestro grave sin reparacion registrada. |
| `8A1FB1AB2JT123456` | Renault Logan 2018 | `REVOCADO` | VTV rechazada. |
| `WAUZZZ8V5KA123456` | Volkswagen Amarok 2021 | `ACTIVO` | Transferida, motor y capot reemplazados, 3 services. |
| `9BWZZZ377VT004251` | Volkswagen Vento 2017 | `ACTIVO` | Transferido, puerta/caja reemplazadas, 4 services. |
| `JHMFA16586S012345` | Peugeot 208 2020 | `VENCIDO` | Transferido, baul reemplazado y VTV con observaciones. |

## Rechazos que demuestra el contrato

El contrato no solo guarda informacion; tambien valida reglas de negocio:

- Rechaza VINs que no tengan 17 caracteres.
- Rechaza registrar dos veces el mismo VIN.
- Rechaza cargar historial sobre un token inexistente.
- Rechaza services con kilometraje menor o igual al ultimo registrado.
- Rechaza escrituras desde wallets sin el rol requerido.
- Rechaza transferencias iniciadas por una wallet que no sea el propietario.

## Archivos relacionados

- Contrato: `contracts/CarPass.sol`.
- Deployment versionado: `deployments/sepolia/CarPass.json`.
- ABI del frontend: `frontend/src/contracts/carpassAbi.ts`.
- Address del frontend: `frontend/src/contracts/carpassDeployment.ts`.
- Guia operativa: `docs/DEPLOY.md`.
- Mapa de codigo: `docs/CODEMAP.md`.
- Verificacion on-chain: `scripts/verify-deployment.mjs`.
