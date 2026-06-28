# SDD - EPIC-07: Contract Test Suite

## Problema que resuelve

El equipo necesita demostrar durante la defensa que las reglas principales del contrato se cumplen y que los rechazos se producen on-chain. En el MVP, la prueba imprescindible es la regla de kilometraje monotonicamente creciente para services.

## Alcance MVP

- Agregar una suite automatizada minima del contrato.
- Cubrir carga valida de un service por una wallet con `MECANICO_ROLE`.
- Cubrir rechazo de un service con kilometraje menor o igual al ultimo registrado.
- No cubrir todavia doble VIN, transferencias no autorizadas ni estados del sello; quedan para Fase 2.

## Interfaces ejercitadas

- `registrarVehiculo(VehiculoInfo calldata info, address propietarioInicial)`.
- `grantRole(bytes32 role, address account)`.
- `agregarService(uint256 tokenId, RegistroService calldata registro)`.
- `getHistorialService(uint256 tokenId)`.
- `ultimoKilometrajeRegistrado(uint256 tokenId)`.

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

## Comando de verificacion

```bash
npm run test:contracts
npm run compile
```

## Estado implementado

- Existe `test/CarPass.km.ts`.
- Existe el script `npm run test:contracts`.
- La suite MVP despliega `CarPass`, registra un vehiculo, asigna `MECANICO_ROLE`, carga un service valido y verifica rechazo por kilometraje menor.

## Impacto en frontend

La suite de contrato no cambia ABI. La interfaz grafica de modelado consume la misma regla: muestra ultimo kilometraje, permite simular el siguiente service y anticipa si el contrato rechazaria un km menor o igual.

## Riesgos

- La suite MVP no reemplaza la bateria completa de Fase 2.
- Los tests no validan todavia todos los estados del sello de calidad, aunque Epic 06 ya implementa `getSelloCalidad`, `getSelloEstado` y `calcularSello`.
