# Roles & Access Control

## Problema que resuelve

CarPass necesita controlar que solo actores autorizados escriban en el historial vehicular. El administrador debe poder asignar y revocar roles, y cada función de escritura debe aceptar únicamente el rol correspondiente.

El historial ya escrito no se borra ni se modifica si una wallet pierde un rol. Para trazabilidad, los registros guardan la wallet autora cuando corresponde, de modo que una interfaz o consulta externa pueda cruzarla con `estaRevocado(wallet)`.

## Alcance MVP

- Declarar roles de administrador, concesionaria/registrador, taller, aseguradora y VTV.
- Usar `grantRole` y `revokeRole` heredados de OpenZeppelin `AccessControl`.
- Proteger mutadores con modifiers o checks de rol.
- Mantener registros históricos append-only.
- No agregar infraestructura adicional fuera del control de acceso.

La política operativa de revocación de talleres queda para Fase 2, pero el contrato ya expone `revokeRole`, `revocadoEn` y `estaRevocado` porque vienen de `AccessControl` y de la trazabilidad mínima implementada.

## Roles

| Rol | Constante | Actor | Puede llamar |
| --- | --- | --- | --- |
| Administrador | `DEFAULT_ADMIN_ROLE` | Deployer / multisig futura | `grantRole`, `revokeRole` |
| Concesionaria | `REGISTRADOR_ROLE` | Concesionarias autorizadas | `registrarVehiculo` |
| Taller | `MECANICO_ROLE` | Talleres autorizados | `agregarService` |
| Aseguradora | `ASEGURADORA_ROLE` | Compañías de seguros | `agregarSiniestro` |
| VTV | `INSPECTOR_VTV_ROLE` | Plantas verificadoras | `agregarVTV` |

## Interfaces públicas

### Heredadas de AccessControl

- `grantRole(bytes32 role, address account)`: asigna un rol. Solo lo puede llamar el admin del rol.
- `revokeRole(bytes32 role, address account)`: revoca un rol. Solo lo puede llamar el admin del rol.
- `hasRole(bytes32 role, address account)`: consulta si una wallet tiene un rol.
- `getRoleAdmin(bytes32 role)`: consulta el rol administrador.

### Propias de CarPass

- `estaRevocado(address wallet) returns (bool)`: devuelve si la wallet tuvo algún rol revocado.
- `revocadoEn(address wallet) returns (uint256)`: getter público del timestamp de revocación.

## Reglas de autorización

| Función | Regla |
| --- | --- |
| `registrarVehiculo` | `onlyRole(REGISTRADOR_ROLE)` |
| `agregarService` | `onlyRole(MECANICO_ROLE)` |
| `agregarSiniestro` | `ASEGURADORA_ROLE` |
| `agregarVTV` | `onlyRole(INSPECTOR_VTV_ROLE)` |
| `grantRole` | `AccessControl`, admin del rol |
| `revokeRole` | `AccessControl`, admin del rol |

## Eventos

- `RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`: heredado de OpenZeppelin.
- `RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)`: heredado de OpenZeppelin.
- `WalletRevocada(address indexed wallet, bytes32 indexed rol, uint256 timestamp)`: agrega timestamp on-chain para trazabilidad.

## Errores esperados

- `AccessControlUnauthorizedAccount(address account, bytes32 neededRole)`: llamada sin rol autorizado.
- `AccessControlBadConfirmation()`: `renounceRole` con confirmación inválida.

## Impacto en ABI

- `ASEGURADORA_ROLE` queda disponible como constante pública.
- `RegistroSiniestro` agrega `address declarante` para conservar qué wallet cargó el registro.
- `agregarSiniestro` acepta callers con `ASEGURADORA_ROLE`.
- `revocadoEn` y `estaRevocado` permiten marcar en lectura registros de una wallet revocada sin mutar historial.

## Criterios de aceptación

- El deployer recibe `DEFAULT_ADMIN_ROLE` y `REGISTRADOR_ROLE`.
- Un admin puede otorgar roles con `grantRole`.
- Una wallet sin rol no puede ejecutar funciones de escritura.
- Una aseguradora con `ASEGURADORA_ROLE` puede cargar siniestros.
- Un registrador con `REGISTRADOR_ROLE` no puede cargar siniestros.
- Un siniestro queda guardado con `declarante = msg.sender`.
- Revocar una wallet no borra ni modifica services, VTV ni siniestros previos.

## Verificación

```bash
npm run compile
npm audit --audit-level=high
```
