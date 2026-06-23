# EPIC-07 — Roles & Access Control
## Software/System Design Document (SDD)

**Versión:** 1.0  
**Fecha:** 2026-06-23  
**Epic:** EPIC-07 — Roles & Access Control  
**Proyecto:** carPass — Historial vehicular inmutable en blockchain

---

## 1. Overview

El skeleton de EPIC-02 declara tres constantes de rol y hereda `AccessControl` de OpenZeppelin, pero no define la semántica completa de revocación ni el quinto rol (`ASEGURADORA_ROLE`). El problema concreto que resuelve este epic es doble:

1. **Control de escritura por actor**: cada tipo de actor (taller, planta VTV, aseguradora, concesionaria) debe poder escribir únicamente los registros que le competen.
2. **Revocación sin borrado**: cuando se revoca a un actor que mintió o registró datos falsos, sus registros previos deben permanecer inmutables pero quedar identificables como pertenecientes a una wallet revocada.

**Principios de diseño:**
- La autorización se verifica antes de cualquier mutación de estado.
- Revocar un rol no modifica ni elimina registros históricos existentes.
- El marcado de revocación es permanente on-chain aunque el rol sea re-otorgado.
- La lectura de historial es pública y no requiere wallet.

---

## 2. Roles del sistema

### 2.1 Tabla de roles

| Rol | Constante Solidity | Actor | Puede llamar |
|-----|--------------------|-------|-------------|
| Admin | `DEFAULT_ADMIN_ROLE` | Deployer / multisig | `grantRole`, `revokeRole` |
| Registrador | `REGISTRADOR_ROLE` | Concesionarias autorizadas | `registrarVehiculo`, `agregarSiniestro` |
| Mecánico | `MECANICO_ROLE` | Talleres autorizados | `agregarService` |
| Inspector VTV | `INSPECTOR_VTV_ROLE` | Plantas verificadoras habilitadas | `agregarVTV` |
| Aseguradora | `ASEGURADORA_ROLE` | Compañías de seguros | `agregarSiniestro` |

### 2.2 Constantes de rol

```solidity
// Heredado de OZ AccessControl — no declarar
// bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

bytes32 public constant REGISTRADOR_ROLE   = keccak256("REGISTRADOR_ROLE");
bytes32 public constant MECANICO_ROLE      = keccak256("MECANICO_ROLE");
bytes32 public constant INSPECTOR_VTV_ROLE = keccak256("INSPECTOR_VTV_ROLE");
bytes32 public constant ASEGURADORA_ROLE   = keccak256("ASEGURADORA_ROLE");  // NUEVO
```

`ASEGURADORA_ROLE` no existía en el skeleton de EPIC-02. Se agrega aquí.

---

## 3. Variables de estado

### 3.1 Existentes (sin cambios)

```solidity
mapping(uint256 => VehiculoInfo)        private _vehiculos;
mapping(uint256 => RegistroService[])   private _services;
mapping(uint256 => RegistroSiniestro[]) private _siniestros;
mapping(uint256 => RegistroVTV[])       private _vtv;
mapping(uint256 => SelloEstado)         private _sellos;
```

### 3.2 Nuevas (EPIC-07)

```solidity
// Timestamp de la última revocación de cualquier rol sobre esta wallet.
// 0 = nunca revocada. No se resetea si el rol es re-otorgado.
mapping(address => uint256) public revocadoEn;
```

El mapping es `public` para permitir consulta directa desde el frontend y scripts externos sin necesidad de una función getter explícita.

---

## 4. Interfaz de funciones

### 4.1 Heredadas de OZ AccessControl (sin override)

```solidity
/**
 * @notice Otorga `role` a `account`. Solo puede llamarla quien tenga el admin de ese rol.
 * @dev DEFAULT_ADMIN_ROLE es admin de todos los roles por defecto.
 */
function grantRole(bytes32 role, address account) public virtual;

/**
 * @notice Devuelve true si `account` tiene `role`.
 */
function hasRole(bytes32 role, address account) external view returns (bool);

/**
 * @notice Devuelve el rol administrador de `role`.
 */
function getRoleAdmin(bytes32 role) external view returns (bytes32);

/**
 * @notice Permite a msg.sender auto-revocar su propio rol.
 * @dev Requiere callerConfirmation == msg.sender para evitar llamadas accidentales.
 */
function renounceRole(bytes32 role, address callerConfirmation) public virtual;
```

### 4.2 Override: revokeRole

```solidity
/**
 * @notice Revoca `role` de `account` y registra la revocación on-chain.
 * @dev Extiende OZ revokeRole para setear revocadoEn y emitir WalletRevocada.
 *      La auth check (onlyRole del admin del rol) la realiza super.revokeRole internamente.
 *      El historial de registros escritos por `account` queda inmutable.
 */
function revokeRole(bytes32 role, address account) public override;
```

**Lógica de implementación:**
```solidity
function revokeRole(bytes32 role, address account) public override {
    bool hadRole = hasRole(role, account);
    super.revokeRole(role, account);
    if (hadRole) {
        revocadoEn[account] = block.timestamp;
        emit WalletRevocada(account, role, block.timestamp);
    }
}
```

- `hadRole` se evalúa antes de `super.revokeRole` porque OZ lo setea a false durante la ejecución.
- `revocadoEn` no se resetea si el rol se re-otorga posteriormente — es una marca histórica permanente.

### 4.3 Nueva: estaRevocado

```solidity
/**
 * @notice Devuelve true si la wallet tuvo al menos un rol revocado alguna vez.
 * @dev El frontend usa esto para mostrar advertencia en los registros históricos del actor.
 */
function estaRevocado(address wallet) external view returns (bool);
```

**Implementación:** `return revocadoEn[wallet] != 0;`

---

## 5. Eventos

### 5.1 Nuevo (EPIC-07)

```solidity
// Emitido cuando se revoca un rol de una wallet.
// Complementa el RoleRevoked de OZ agregando block.timestamp para trazabilidad on-chain.
event WalletRevocada(
    address indexed wallet,
    bytes32 indexed rol,
    uint256         timestamp
);
```

### 5.2 Heredados de OZ AccessControl (sin declarar en el contrato)

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
```

`WalletRevocada` existe en adición a `RoleRevoked` porque `RoleRevoked` no incluye `block.timestamp` en su firma — necesario para que el frontend pueda saber cuándo ocurrió la revocación sin parsear el block header.

---

## 6. Modifiers de autorización por función

| Función | Control de acceso |
|---------|------------------|
| `registrarVehiculo` | `onlyRole(REGISTRADOR_ROLE)` |
| `agregarService` | `onlyRole(MECANICO_ROLE)` |
| `agregarSiniestro` | `REGISTRADOR_ROLE` **o** `ASEGURADORA_ROLE` (ver nota) |
| `agregarVTV` | `onlyRole(INSPECTOR_VTV_ROLE)` |
| `grantRole` | OZ interno: `onlyRole(getRoleAdmin(role))` |
| `revokeRole` | OZ interno: `onlyRole(getRoleAdmin(role))` |
| `renounceRole` | `callerConfirmation == msg.sender` (OZ) |
| `estaRevocado` | público, sin restricción |
| todas las consultas `get*` | público, sin restricción |

> **Nota sobre `agregarSiniestro`:** requiere que el caller tenga `REGISTRADOR_ROLE` **o** `ASEGURADORA_ROLE`. OZ `onlyRole` verifica un único rol. La implementación se resuelve en EPIC-04 (historial) con un modifier custom:
> ```solidity
> modifier soloRegistradorOAseguradora() {
>     if (!hasRole(REGISTRADOR_ROLE, msg.sender) && !hasRole(ASEGURADORA_ROLE, msg.sender)) {
>         revert AccessControlUnauthorizedAccount(msg.sender, REGISTRADOR_ROLE);
>     }
>     _;
> }
> ```
> Este SDD define la existencia del rol; el modifier se implementa en el epic de historial.

---

## 7. Constructor

Sin cambios respecto a EPIC-02. El deployer recibe `DEFAULT_ADMIN_ROLE` y `REGISTRADOR_ROLE`. Ningún otro rol se auto-otorga en el constructor.

```solidity
constructor() ERC721("CarPass", "CPASS") {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(REGISTRADOR_ROLE,   msg.sender);
}
```

---

## 8. Errores esperados

| Error | Origen | Cuándo se produce |
|-------|--------|------------------|
| `AccessControlUnauthorizedAccount(address account, bytes32 neededRole)` | OZ custom error | Llamada a función protegida sin el rol requerido |
| `AccessControlBadConfirmation()` | OZ custom error | `renounceRole` llamado con `callerConfirmation != msg.sender` |

No se agregan custom errors propios en este epic; los de OZ cubren todos los casos de rechazo de autorización.

---

## 9. Reglas de negocio

| Regla | Descripción |
|-------|-------------|
| Inmutabilidad del historial | Revocar un rol no modifica ni elimina los registros previos escritos por ese actor |
| Marcado permanente | `revocadoEn[wallet] > 0` es permanente aunque se re-otorgue el rol; indica que esa wallet fue revocada en algún momento |
| Autorización antes de mutación | Todo `onlyRole` se evalúa como primer modifier; nunca después de leer o escribir estado |
| Admin es su propio admin | `DEFAULT_ADMIN_ROLE` es admin de sí mismo (OZ default); en producción debe ser una multisig |
| Sin enumeración on-chain | Se usa `AccessControl` base (no `AccessControlEnumerable`); la lista de wallets por rol se reconstruye desde event logs off-chain |
| Lectura pública | `hasRole`, `estaRevocado`, `revocadoEn` y todas las consultas de historial son accesibles sin wallet |

---

## 10. Casos felices y rechazos

### Casos felices

| Acción | Actor | Resultado |
|--------|-------|-----------|
| `grantRole(MECANICO_ROLE, tallerX)` | Admin | `RoleGranted` emitido; `tallerX` puede llamar `agregarService` |
| `revokeRole(MECANICO_ROLE, tallerX)` | Admin | `RoleRevoked` + `WalletRevocada` emitidos; `revocadoEn[tallerX] = block.timestamp`; servicios previos inmutables |
| `estaRevocado(tallerX)` | cualquiera | `true` |
| `agregarService(tokenId, registro)` | tallerX con MECANICO_ROLE | registro appendeado, `ServiceAgregado` emitido |
| `hasRole(MECANICO_ROLE, tallerX)` post-revocación | cualquiera | `false` |

### Rechazos

| Acción | Actor | Revert |
|--------|-------|--------|
| `agregarService(...)` | wallet sin MECANICO_ROLE | `AccessControlUnauthorizedAccount` |
| `grantRole(MECANICO_ROLE, x)` | wallet sin DEFAULT_ADMIN_ROLE | `AccessControlUnauthorizedAccount` |
| `revokeRole(MECANICO_ROLE, x)` | wallet sin DEFAULT_ADMIN_ROLE | `AccessControlUnauthorizedAccount` |
| `renounceRole(MECANICO_ROLE, otroAddress)` | cualquiera | `AccessControlBadConfirmation` |
| `revokeRole(MECANICO_ROLE, wallet_sin_rol)` | Admin | no revierte — OZ ignora si la wallet no tiene el rol; `WalletRevocada` no se emite (guard `hadRole`) |

---

## 11. Impacto en ABI y frontend

### Cambios en ABI respecto a EPIC-02 skeleton

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `ASEGURADORA_ROLE` | `bytes32 constant` | Nuevo |
| `revocadoEn(address)` | `mapping → uint256` getter | Nuevo |
| `estaRevocado(address)` | `function view → bool` | Nuevo |
| `WalletRevocada` | `event` | Nuevo |
| `revokeRole(bytes32, address)` | `function` override | Misma firma ABI, comportamiento extendido |

### Uso desde frontend (ethers v6)

```typescript
// Verificar si una wallet estuvo revocada alguna vez
const revocado = await contract.estaRevocado(autorAddress);

// Obtener timestamp exacto de revocación (0 si nunca revocada)
const timestamp = await contract.revocadoEn(autorAddress);

// Escuchar nuevas revocaciones en tiempo real
contract.on("WalletRevocada", (wallet, rol, timestamp) => {
    invalidarCacheWallet(wallet);
});
```

El frontend muestra un badge de advertencia en cada registro histórico cuyo autor tenga `estaRevocado == true`.

---

## 12. Riesgos de seguridad y privacidad

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| Clave del deployer comprometida | El deployer tiene `DEFAULT_ADMIN_ROLE`; puede otorgar/revocar cualquier rol | Transferir `DEFAULT_ADMIN_ROLE` a multisig (Gnosis Safe) inmediatamente post-deploy |
| `renounceRole` del único admin | OZ permite que el único admin se auto-revoque, dejando el contrato sin admin y los roles permanentes | Documentado como riesgo operacional; el admin debe ser multisig que no puede renunciar sin quórum |
| Re-grant no borra marca de revocación | Una wallet re-contratada queda marcada como revocada históricamente | Intencional por diseño de trazabilidad; el frontend debe mostrar ambos estados |
| Enumeración de actores | No hay enumeración on-chain; las wallets se descubren por event logs | No es riesgo de privacidad — las wallets ya son públicas en Sepolia |
| Escalada de privilegios | Ningún rol puede auto-promover a DEFAULT_ADMIN_ROLE (OZ lo impide) | Cobertura nativa de OZ AccessControl |

---

## 13. Dependencias externas

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| OpenZeppelin Contracts | ^5.6.1 | `AccessControl`, `ERC721`, custom errors `AccessControlUnauthorizedAccount` |
| Solidity | ^0.8.28 | Compilador |
| Hardhat | ^3.9.0 | Toolchain |

---

## 14. Verificación

```bash
npm run compile
```

Debe compilar sin errores con la nueva constante `ASEGURADORA_ROLE`, el mapping `revocadoEn`, el evento `WalletRevocada`, el override `revokeRole` y la función `estaRevocado`.
