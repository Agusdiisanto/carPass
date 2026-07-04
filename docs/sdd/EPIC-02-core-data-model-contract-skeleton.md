# EPIC-02 — Core Data Model & Contract Skeleton
## Software/System Design Document (SSD)

**Versión:** 1.1  
**Fecha:** 2026-06-23  
**Epic:** EPIC-02 — Core Data Model & Contract Skeleton  
**Proyecto:** carPass — Historial vehicular inmutable en blockchain

---

## 1. Overview

carPass es un sistema de historial vehicular basado en NFTs (ERC-721). Cada token representa a un vehículo único identificado por su VIN (Vehicle Identification Number). El historial es **append-only**: una vez escrito, un registro no puede ser modificado ni eliminado, garantizando la integridad de la información.

**Principios de diseño:**
- 1 VIN = 1 NFT = 1 historial
- Los registros son inmutables una vez cargados
- El acceso de escritura está controlado por roles
- La lectura del historial es pública

---

## 2. Modelo de Datos

### 2.1 Enums

```solidity
// Gravedad de un siniestro declarado
enum SiniestroGravedad {
    LEVE,       // daños estéticos menores
    MODERADO,   // daños estructurales parciales
    GRAVE       // pérdida total o daño estructural severo
}

// Resultado de una inspección VTV
enum VTVResultado {
    APROBADO,
    APROBADO_CON_OBSERVACIONES,
    RECHAZADO
}

// Estado del sello de reputación del vehículo
enum SelloEstado {
    ACTIVO,   // historial sin alertas graves, VTV vigente
    VENCIDO,  // VTV expirada o sin VTV reciente
    REVOCADO  // siniestro GRAVE o VTV rechazada
}
```

### 2.2 Structs

```solidity
// Datos inmutables del vehículo, cargados al momento del mint
struct VehiculoInfo {
    string  vin;          // identificador único (17 caracteres ISO 3779)
    string  marca;
    string  modelo;
    uint16  anio;
    string  color;
}

// Registro de un service realizado
struct RegistroService {
    uint256 timestamp;      // block.timestamp al momento de la carga
    string  tipoServicio;   // "aceite", "frenos", "cubiertas", "full", etc.
    uint32  kilometraje;    // km al momento del service
    address taller;         // dirección on-chain del taller (msg.sender, verificado por MECANICO_ROLE)
    string  descripcion;    // detalle libre
}

// Registro de un siniestro declarado
struct RegistroSiniestro {
    uint256           timestamp;
    uint256           costoEstimado;  // en centavos (uint para evitar decimales)
    string            descripcion;
    SiniestroGravedad gravedad;
    bool              reparado;       // ¿el daño fue reparado?
    address           declarante;      // msg.sender con ASEGURADORA_ROLE
}

// Registro de una inspección VTV
struct RegistroVTV {
    uint256      timestamp;
    uint256      vencimiento;  // timestamp en el que expira la VTV aprobada
    VTVResultado resultado;
    address      planta;       // dirección on-chain de la planta verificadora (msg.sender, verificado por INSPECTOR_VTV_ROLE)
}
```

> Nota (hardening de gas, 2026-07-03): el orden de campos se reordenó respecto al original para mejorar el packing de storage — agrupar los campos chicos (`gravedad`+`reparado`+`declarante`, o `resultado`+`planta`) al final permite que compartan un slot de 32 bytes en vez de ocupar uno cada uno. `RegistroSiniestro` pasó de 6 a 4 slots por registro y `RegistroVTV` de 4 a 3. Es un cambio de ABI (el orden del tuple retornado por los getters de historial cambia); el frontend accede a los campos por nombre vía ethers, así que no requirió cambios funcionales, solo re-exportar el ABI (`npm run export:frontend`).

---

## 3. Estrategia de Identificación por VIN

### Derivación del tokenId

```
tokenId = uint256(keccak256(abi.encodePacked(vin)))
```

**Propiedades:**
| Propiedad | Detalle |
|-----------|---------|
| Determinístico | El mismo VIN siempre produce el mismo `tokenId` |
| Sin colisiones prácticas | keccak256 produce 256 bits; la probabilidad de colisión es negligible |
| Sin mapping extra | No se necesita `mapping(string => uint256)` para buscar por VIN |
| Inmutable | El `tokenId` no cambia si cambia el propietario |

**Unicidad garantizada por:** `_exists(tokenId)` de ERC721 — si ya existe, el mint revierte.

**Función de utilidad pública:**
```solidity
function vinToTokenId(string calldata vin) external pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(vin)));
}
```

---

## 4. Arquitectura del Contrato

### 4.1 Árbol de herencia

```
CarPass
  ├── ERC721          (OpenZeppelin v5 — estándar de token no fungible)
  └── AccessControl   (OpenZeppelin v5 — control de permisos por rol)
```

- **ERC721** provee: mint, transferencia, ownership, `tokenURI`, `_exists`
- **AccessControl** provee: `grantRole`, `revokeRole`, `hasRole`, `onlyRole`

### 4.2 Roles y permisos

| Rol | Constante Solidity | Responsable | Puede hacer |
|-----|--------------------|-------------|-------------|
| Admin | `DEFAULT_ADMIN_ROLE` | Deployer | Asignar/revocar todos los roles |
| Registrador | `REGISTRADOR_ROLE` | Concesionarias, admin | `registrarVehiculo` |
| Mecánico | `MECANICO_ROLE` | Talleres autorizados | `agregarService` |
| Inspector VTV | `INSPECTOR_VTV_ROLE` | Plantas verificadoras habilitadas | `agregarVTV` |
| Aseguradora | `ASEGURADORA_ROLE` | Compañías de seguros | `agregarSiniestro` |

**Constantes de rol:**
```solidity
bytes32 public constant REGISTRADOR_ROLE   = keccak256("REGISTRADOR_ROLE");
bytes32 public constant MECANICO_ROLE      = keccak256("MECANICO_ROLE");
bytes32 public constant INSPECTOR_VTV_ROLE = keccak256("INSPECTOR_VTV_ROLE");
bytes32 public constant ASEGURADORA_ROLE   = keccak256("ASEGURADORA_ROLE");
```

---

## 5. Variables de Estado

```solidity
mapping(uint256 => VehiculoInfo)        private _vehiculos;
mapping(uint256 => RegistroService[])   private _services;
mapping(uint256 => RegistroSiniestro[]) private _siniestros;
mapping(uint256 => RegistroVTV[])       private _vtv;
mapping(uint256 => SelloEstado)         private _sellos;
```

Todas las escrituras son append-only; no hay función que modifique ni elimine un registro existente.

---

## 6. Interfaz de Funciones

### 6.1 Alta de vehículo

```solidity
/**
 * @notice Registra un vehículo nuevo y acuña su NFT.
 * @dev Deriva tokenId del VIN con keccak256. Revierte si el VIN ya existe.
 * @param info  Datos del vehículo a registrar.
 * @param propietarioInicial  Direccion que recibira el pasaporte digital.
 * @return tokenId  Identificador del token acuñado.
 */
function registrarVehiculo(VehiculoInfo calldata info, address propietarioInicial)
    external
    onlyRole(REGISTRADOR_ROLE)
    returns (uint256 tokenId);
```

### 6.2 Carga de hitos

```solidity
/**
 * @notice Agrega un registro de service al historial del vehículo.
 * @dev Solo roles MECANICO_ROLE. El tokenId debe existir.
 */
function agregarService(uint256 tokenId, RegistroService calldata registro)
    external
    onlyRole(MECANICO_ROLE);

/**
 * @notice Agrega un siniestro al historial del vehículo.
 * @dev Solo ASEGURADORA_ROLE. Puede disparar recálculo de sello.
 */
function agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)
    external
    onlyRole(ASEGURADORA_ROLE);

/**
 * @notice Agrega un resultado de inspección VTV.
 * @dev Solo INSPECTOR_VTV_ROLE. Puede disparar recálculo de sello.
 */
function agregarVTV(uint256 tokenId, RegistroVTV calldata registro)
    external
    onlyRole(INSPECTOR_VTV_ROLE);
```

### 6.3 Consultas de historial

```solidity
function getVehiculoInfo(uint256 tokenId)
    external view returns (VehiculoInfo memory);

function getHistorialService(uint256 tokenId)
    external view returns (RegistroService[] memory);

function getHistorialSiniestros(uint256 tokenId)
    external view returns (RegistroSiniestro[] memory);

function getHistorialVTV(uint256 tokenId)
    external view returns (RegistroVTV[] memory);
```

### 6.4 Sello de reputación

```solidity
/**
 * @notice Devuelve el estado actual del sello del vehículo.
 */
function getSelloEstado(uint256 tokenId)
    external view returns (SelloEstado);

/**
 * @notice Recalcula el sello según las reglas de negocio y emite evento si cambió.
 * @dev Lógica: REVOCADO si hay siniestro GRAVE o VTV rechazada;
 *      VENCIDO si la última VTV aprobada está expirada o no hay VTV;
 *      ACTIVO en caso contrario.
 */
function calcularSello(uint256 tokenId) external;
```

### 6.5 Utilidad

```solidity
/**
 * @notice Convierte un VIN en su tokenId correspondiente (pure, sin estado).
 */
function vinToTokenId(string calldata vin) external pure returns (uint256);
```

---

## 7. Eventos

```solidity
// Emitido al registrar un vehículo nuevo
event VehicleMinted(
    uint256 indexed tokenId,
    string vin,
    address indexed owner,
    address indexed registrar
);

// Emitido al agregar un service
event ServiceAgregado(
    uint256 indexed tokenId,
    uint256         timestamp,
    string          tipoServicio
);

// Emitido al agregar un siniestro
event SiniestroAgregado(
    uint256           indexed tokenId,
    uint256                   timestamp,
    SiniestroGravedad         gravedad
);

// Emitido al agregar un resultado VTV
event VTVAgregada(
    uint256      indexed tokenId,
    uint256              timestamp,
    VTVResultado         resultado
);

// Emitido cuando el sello cambia de estado
event SelloActualizado(
    uint256    indexed tokenId,
    SelloEstado        nuevoEstado
);
```

---

## 8. Restricciones y Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| VIN único | No se puede registrar dos vehículos con el mismo VIN |
| Append-only | Ningún registro puede ser editado o eliminado |
| Token existente | Toda operación de escritura de historial requiere que el token exista |
| Sello REVOCADO | Un siniestro GRAVE o VTV rechazada pone el sello en REVOCADO de forma permanente (a definir en EPIC-03 si es reversible) |
| Sello VENCIDO | Si `block.timestamp > vencimiento` de la última VTV aprobada, el sello es VENCIDO |

---

## 9. Dependencias Externas

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| OpenZeppelin Contracts | ^5.0.0 | ERC721, AccessControl |
| Solidity | ^0.8.20 | Compilador |
| Hardhat | — | Toolchain de desarrollo, compilación y deploy |
