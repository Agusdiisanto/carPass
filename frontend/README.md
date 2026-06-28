# CarPass Frontend

Frontend Vite + React + TypeScript para CarPass.

## Regla para agentes

El usuario no quiere tests ni validaciones frontend. No agregar archivos de test, no configurar Playwright/e2e, no ejecutar build, lint, audits ni otras validaciones del frontend salvo pedido explicito del usuario en ese turno.

## Uso manual

```bash
npm run dev
```

## Variables

```bash
VITE_SEPOLIA_CHAIN_ID=11155111
VITE_CARPASS_CONTRACT_ADDRESS=0x... # opcional si existe artefacto exportado
```

El ABI se importa desde `src/contracts/carpassAbi.ts`, generado con `npm run export:frontend` desde la raiz.
