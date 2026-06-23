# Validation Matrix

## Always

```bash
npm run compile
```

## Commits

Si el usuario pide commitear, el mensaje no debe contener `Co-authored-by:` ni ningun trailer de coautoria. Antes de cerrar una tanda de commits, revisar el mensaje o el rango creado si hace falta.

## Frontend Changes

No ejecutar validaciones frontend. Esto incluye build, lint, e2e, Playwright y audit de `frontend`. Solo hacerlo si el usuario lo pide explicitamente en el turno actual.

## Dependency Or Security Changes

```bash
npm audit --audit-level=high
git check-ignore -v .env frontend/.env
```

## Deploy Changes

Do not deploy unless explicitly requested. When deploying, require:

- `SEPOLIA_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- sufficient Sepolia ETH
- documented deployed address
- frontend `VITE_CARPASS_CONTRACT_ADDRESS` update
