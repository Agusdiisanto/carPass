# Frontend DApp Skill - CarPass

Use esta skill para cambios en `frontend/`.

## Stack

- Vite + React + TypeScript.
- ethers v6.
- Variables publicas con prefijo `VITE_`.

## Convenciones

- Separar lectura publica por QR de operaciones con wallet.
- Detectar MetaMask con `window.ethereum`.
- Validar `VITE_SEPOLIA_CHAIN_ID` antes de enviar transacciones.
- Mostrar errores de contrato con mensajes claros y cortos.
- No construir pantallas de escritura hasta tener ABI estable.
- Mantener componentes chicos: wallet, contrato, rol y vista publica separados.

## Verificacion

No ejecutar validaciones frontend. Esto incluye `npm run frontend:build`, lint, e2e, Playwright y audit de `frontend`. Dejar criterios de aceptacion en la spec y esperar pedido explicito del usuario si quiere validar.
