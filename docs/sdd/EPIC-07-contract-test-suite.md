# Contract Test Suite

## Problema que resuelve

El equipo necesita demostrar durante la defensa que las reglas principales del contrato se cumplen y que los rechazos se producen on-chain. En el MVP, la prueba imprescindible es la regla de kilometraje monotonicamente creciente para services.

## Alcance implementado

- Agregar una suite automatizada minima del contrato.
- Cubrir carga valida de un service por una wallet con `MECANICO_ROLE`.
- Cubrir rechazo de un service con kilometraje menor o igual al ultimo registrado.
- Cubrir doble VIN.
- Cubrir carga por wallet sin rol.
- Cubrir transferencia por wallet no propietaria.
- Cubrir revocacion de taller: conserva historial previo y bloquea nuevas cargas.
- Cubrir estados principales del sello: `ACTIVO`, `VENCIDO`, `REVOCADO`.

## Interfaces ejercitadas

- `registrarVehiculo(VehiculoInfo calldata info, address propietarioInicial)`.
- `grantRole(bytes32 role, address account)`.
- `agregarService(uint256 tokenId, RegistroService calldata registro)`.
- `getHistorialService(uint256 tokenId)`.
- `ultimoKilometrajeRegistrado(uint256 tokenId)`.
- `transferFrom(address from, address to, uint256 tokenId)`.
- `revokeRole(bytes32 role, address account)`.
- `estaRevocado(address wallet)`.
- `getSelloCalidad(uint256 tokenId)`.

## Roles usados

- `DEFAULT_ADMIN_ROLE`: deployer que otorga roles.
- `REGISTRADOR_ROLE`: deployer que registra el vehiculo inicial.
- `MECANICO_ROLE`: wallet del taller usada para cargar services.

## Casos de prueba MVP

1. Camino feliz:
   - Deploy de `CarPass`.
   - Alta de vehiculo con VIN valido.
   - Grant de `MECANICO_ROLE` a una wallet de taller.
   - Carga de service con kilometraje mayor a `0`.
   - Verificacion de evento `ServiceAgregado`.
   - Verificacion de autoria `taller = msg.sender`.
   - Verificacion de `ultimoKilometrajeRegistrado`.

2. Rechazo:
   - Carga inicial valida.
   - Intento posterior con kilometraje menor al ultimo.
   - Rechazo con `KilometrajeNoMonotonico(recibido, ultimo)`.
   - El historial y el ultimo kilometraje no cambian luego del rechazo.

3. Rechazos de defensa:
   - Doble VIN revierte con `VehiculoYaRegistrado`.
   - Wallet sin `MECANICO_ROLE` revierte con `AccessControlUnauthorizedAccount`.
   - Transferencia por no propietario revierte con `TransferenciaSoloPropietario`.
   - Taller revocado queda marcado con `estaRevocado` y no puede cargar nuevos services.

4. Sello:
   - Service + VTV vigente aprobada devuelve `ACTIVO`.
   - Service sin VTV devuelve `VENCIDO`.
   - Siniestro grave sin reparar devuelve `REVOCADO`.

## Comando de verificacion

```bash
npm run test:contracts
npm run compile
```

## Estado implementado

- Existe `test/CarPass.defense.ts` con helpers en `test/helpers/carPass.ts`.
- Existe el script `npm run test:contracts`.
- La suite despliega `CarPass`, registra vehiculos, asigna roles, cubre services validos/rechazados, doble VIN, permisos, transferencia owner-only, revocacion y estados principales del sello.

## Impacto en frontend

La suite de contrato no cambia ABI. La interfaz grafica de modelado consume la misma regla: muestra ultimo kilometraje, permite simular el siguiente service y anticipa si el contrato rechazaria un km menor o igual.

## Riesgos

- La suite no reemplaza auditoria formal ni pruebas exhaustivas de todos los bordes de VTV/siniestros.
- El objetivo es defensa funcional: demostrar caminos felices, rechazos y estados principales.
