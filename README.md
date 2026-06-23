# CarPass

TP final de la materia Blockchain: sistema de trazabilidad vehicular sobre blockchain.

Cada auto sera representado como un NFT ERC-721 asociado a su VIN. El contrato acumulara historial tecnico inmutable y calculara un sello de calidad consultable por QR. La DApp conectara MetaMask, ruteara por rol y consumira el contrato con ethers.js.

## Stack

- Solidity + Hardhat 3
- OpenZeppelin Contracts
- ethers v6
- React + Vite + TypeScript
- Red Sepolia

## Estructura

```text
contracts/             Smart contracts Solidity
scripts/               Scripts de deploy
frontend/              DApp React
.agents/               Contexto operativo para agentes
.skills/               Skills locales del proyecto
docs/superpowers/      Specs y planes de infraestructura
```

## Setup

```bash
npm install
npm --prefix frontend install
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Completar `.env`:

```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
DEPLOYER_PRIVATE_KEY=0xyour_private_key_without_quotes
ETHERSCAN_API_KEY=your_etherscan_api_key_optional
```

Completar `frontend/.env` luego de desplegar:

```bash
VITE_SEPOLIA_CHAIN_ID=11155111
VITE_CARPASS_CONTRACT_ADDRESS=0x...
```

## Comandos

```bash
npm run compile
npm run deploy:sepolia
npm run frontend:dev
```

## Restriccion del usuario

No agregar, adjuntar ni proponer tests. Los agentes tampoco deben ejecutar validaciones a nivel frontend, incluyendo `npm run frontend:build`, lint, e2e, Playwright o audits del paquete `frontend`, salvo que el usuario lo pida explicitamente en ese turno.

## Flujo SDD recomendado

1. Tomar una epica de `.agents/backlog.md`.
2. Escribir spec detallada en `docs/sdd/`.
3. Implementar contra la spec.
4. Verificar solo lo que no sea frontend, por ejemplo `npm run compile` para contrato.

EPIC-02 debe detallarse antes del frontend porque define el ABI madre del contrato.

## Agentes y skills

Los agentes deben empezar por `AGENTS.md`. El mapa de contexto esta en `.agents/context-map.md` y las skills locales viven en `.skills/`.

Tambien se instalaron skills globales recomendadas para Codex:

- `security-best-practices`
- `security-threat-model`

Reiniciar Codex para que esas skills globales queden disponibles en nuevas sesiones.
