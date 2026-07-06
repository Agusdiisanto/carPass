# Siniestros solo por aseguradora y alta 0 km

## Problema que resuelve

El modelo operativo necesita separar responsabilidades: la concesionaria registra vehiculos nuevos, pero no declara siniestros. Los siniestros deben quedar bajo responsabilidad exclusiva de una aseguradora autorizada. Ademas, todo vehiculo nuevo debe partir con kilometraje inicial `0`.

## Alcance

- Restringir `agregarSiniestro` a `ASEGURADORA_ROLE`.
- Mantener `REGISTRADOR_ROLE` solo para `registrarVehiculo`.
- Comunicar en frontend que el alta de vehiculo parte en `0 km`.
- Remover de la vista de concesionaria el formulario de declaracion de siniestros.
- Mantener la vista de aseguradora como unico flujo de carga de siniestros.
- No cambiar structs, eventos ni firma ABI de `agregarSiniestro`.

## Interfaces publicas

### `registrarVehiculo(VehiculoInfo calldata info, address propietarioInicial) returns (uint256 tokenId)`

Registra un vehiculo nuevo con kilometraje inicial `0`.

Reglas:

- Caller debe tener `REGISTRADOR_ROLE`.
- `ultimoKilometrajeRegistrado[tokenId]` queda en `0` al alta.
- El primer service posterior debe informar un kilometraje mayor a `0`.

### `agregarSiniestro(uint256 tokenId, RegistroSiniestro calldata registro)`

Registra un siniestro para un vehiculo existente.

Reglas:

- Caller debe tener `ASEGURADORA_ROLE`.
- `REGISTRADOR_ROLE` ya no autoriza esta operacion.
- `tokenId` debe existir.
- El contrato sobrescribe `timestamp` con `block.timestamp`.
- El contrato sobrescribe `declarante` con `msg.sender`.

## Roles autorizados

- `REGISTRADOR_ROLE`: registra vehiculos.
- `ASEGURADORA_ROLE`: registra siniestros.
- `MECANICO_ROLE`: registra services.
- `INSPECTOR_VTV_ROLE`: registra VTV.

## Eventos emitidos

- `VehicleMinted(uint256 indexed tokenId, string vin, address indexed owner, address indexed registrar)`.
- `SiniestroAgregado(uint256 indexed tokenId, uint256 timestamp, SiniestroGravedad gravedad)`.

No se agregan eventos nuevos.

## Errores esperados

- `AccessControlUnauthorizedAccount(address account, bytes32 neededRole)`: caller sin `ASEGURADORA_ROLE` intenta cargar un siniestro.
- `VehiculoNoEncontrado(uint256 tokenId)`: siniestro sobre token inexistente.

## Impacto en ABI y frontend

- La firma de `agregarSiniestro` no cambia.
- Cambia la autorizacion on-chain: solo aseguradoras pueden ejecutar la transaccion.
- `RegistradorView` deja de mostrar carga de siniestros.
- La UI de alta de vehiculos indica que el pasaporte se emite con `0 km`.
- La consulta publica muestra `0` como kilometraje inicial cuando no hay services registrados.

## Criterios de aceptacion

- Una wallet con `REGISTRADOR_ROLE` puede registrar vehiculos.
- Un vehiculo recien registrado muestra kilometraje inicial `0`.
- Una wallet con `ASEGURADORA_ROLE` puede registrar siniestros.
- Una wallet solo con `REGISTRADOR_ROLE` no puede registrar siniestros.
- La vista de concesionaria no ofrece declarar siniestros.

## Verificacion

No agregar tests. No ejecutar validaciones frontend.

```bash
npm run compile
npm audit --audit-level=high
```
