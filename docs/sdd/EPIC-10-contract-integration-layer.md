# Contract Integration Layer

## Problema que resuelve

Las vistas de la DApp necesitan una capa unica para leer y escribir en `CarPass`, evitando repetir ABI, address, manejo de errores y estados de transaccion.

## Alcance

- Exportar ABI desde artifact Hardhat.
- Resolver address desde env o despliegue versionado.
- Crear contrato ethers de lectura y escritura.
- Exponer funciones para altas, hitos, roles e historial.
- Parsear errores de contrato con mensajes claros.

## Entradas

- `CARPASS_ABI`.
- `CARPASS_DEPLOYMENT.address`.
- `VITE_CARPASS_CONTRACT_ADDRESS`.
- Provider MetaMask.
- VIN/tokenId y datos de formularios.

## Salidas

- `detectRole(address)`.
- `registrarVehiculo`.
- `agregarService`.
- `agregarSiniestro`.
- `agregarVTV`.
- `grantRole` / `revokeRole`.
- `getVehiculoPorVin`.
- `getHistorial`.
- `getUltimoKm`.

## Reglas

- `VITE_CARPASS_CONTRACT_ADDRESS` tiene prioridad sobre la address versionada para permitir pruebas.
- Si no hay address valida, la DApp debe mostrar contrato no configurado.
- El ABI no debe escribirse manualmente en el hook.
- El parser de errores debe usar el ABI completo exportado.
- La fuente de verdad sigue siendo el contrato; la UI solo anticipa validaciones.

## Criterios de aceptacion

- El frontend importa ABI desde `frontend/src/contracts/carpassAbi.ts`.
- El hook no contiene ABI manual.
- Todos los custom errors relevantes se pueden parsear desde el ABI exportado.
- Las vistas usan el hook y no instancian contratos por su cuenta.

## Verificacion

No ejecutar validaciones frontend salvo pedido explicito del usuario.

Para contrato/artifacts:

```bash
npm run export:frontend
```

## Riesgos

- Si el contrato cambia y no se exporta el ABI, el frontend puede quedar desactualizado.
- La address versionada es publica, pero no reemplaza variables locales para entornos de prueba.
