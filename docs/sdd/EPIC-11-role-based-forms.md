# SDD - EPIC-11: Role-Based Forms

## Problema que resuelve

Cada actor operativo necesita una pantalla simple para ejecutar solo las acciones que su rol puede firmar: alta de vehiculo, service, siniestro, VTV y gestion de roles.

## Alcance

- Panel admin.
- Panel registrador/concesionaria.
- Panel taller.
- Panel aseguradora.
- Panel inspector VTV.
- Vista sin rol.
- Consulta publica por VIN como lectura de historial.

No incluye QR ni adjuntos IPFS.

## Roles autorizados

- `DEFAULT_ADMIN_ROLE`: gestiona roles y puede alternar vistas para demo.
- `REGISTRADOR_ROLE`: registra vehiculos.
- `MECANICO_ROLE`: registra services.
- `ASEGURADORA_ROLE`: registra siniestros.
- `INSPECTOR_VTV_ROLE`: registra VTV.

## Formularios

### Admin

- Registrar vehiculo.
- Asignar rol.
- Revocar rol.
- Alternar vistas de rol para demo.

### Registrador

- Registrar vehiculo con VIN, marca, modelo, anio, color y propietario inicial.
- Comunicar que el kilometraje inicial es `0`.

### Taller

- Buscar vehiculo por VIN.
- Leer ultimo kilometraje.
- Registrar service con kilometraje estrictamente mayor.

### Aseguradora

- Buscar vehiculo por VIN.
- Registrar siniestro con gravedad, descripcion, reparado y costo estimado.

### Inspector VTV

- Buscar vehiculo por VIN.
- Registrar resultado y vencimiento de VTV.

## Reglas UI

- Validar VIN de 17 caracteres antes de buscar/escribir.
- Deshabilitar escrituras mientras hay transaccion pendiente.
- Mostrar mensajes cortos de exito/error.
- Mostrar errores de contrato frecuentes con texto claro para defensa.
- Mantener visible el estado de contrato, red y wallet.
- No ocultar que el contrato puede rechazar aunque la UI permita intentar.

## Impacto en ABI

No cambia ABI. Consume la capa EPIC-10.

## Criterios de aceptacion

- Cada rol ve su panel operativo.
- Admin puede gestionar roles y alternar vistas.
- Taller anticipa rechazo de kilometraje menor o igual.
- Consulta publica muestra historial y sello por VIN.
- Consulta publica incluye panel demo con los 5 VINs semilla y sello esperado.
- La app muestra si el contrato esta configurado, si la red es Sepolia y si hay wallet conectada.
- No hay formularios de QR ni adjuntos documentales.

## Verificacion

No ejecutar validaciones frontend salvo pedido explicito del usuario.

## Riesgos

- Las validaciones UI no reemplazan las validaciones on-chain.
- Las direcciones de wallet deben mantenerse como inputs visibles y no secretos.
