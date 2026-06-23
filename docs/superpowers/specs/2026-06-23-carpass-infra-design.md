# CarPass Infrastructure Design

## Objetivo

Crear la base tecnica del proyecto CarPass: un sistema de trazabilidad vehicular sobre blockchain donde cada auto sera un NFT ERC-721 asociado a un VIN y consultable desde una DApp React.

## Alcance

Esta primera entrega prepara infraestructura, no implementa la logica completa del dominio. Debe dejar:

- Hardhat configurado para Solidity y despliegue en Sepolia.
- Estructura `contracts/`, `scripts/` y `frontend/`.
- Frontend Vite + React + TypeScript preparado para consumir ethers.
- Manejo de secretos con `.env` ignorado y `.env.example` documentado.
- Documentacion inicial para personas y agentes.
- Carpetas `.agents/` y `.skills/` con contexto de SDD, contrato y frontend.

## Arquitectura

El repo queda como monorepo simple. Hardhat vive en la raiz con `contracts/` y `scripts/`. La DApp vive en `frontend/` para mantener separada la experiencia web del paquete blockchain.

El contrato inicial sera un placeholder minimo `CarPass.sol` con ERC-721 y AccessControl para validar toolchain, dependencias y deploy. La logica de hitos, reglas y sello de calidad queda para EPIC-02 en adelante.

## Interfaces

Variables de entorno raiz:

- `SEPOLIA_RPC_URL`: endpoint RPC Sepolia.
- `DEPLOYER_PRIVATE_KEY`: clave privada usada por Hardhat para deploy.
- `ETHERSCAN_API_KEY`: opcional para verificacion futura.

Variables de entorno frontend:

- `VITE_SEPOLIA_CHAIN_ID`: chain id esperado por la DApp.
- `VITE_CARPASS_CONTRACT_ADDRESS`: address del contrato desplegado.

Comandos esperados:

- `npm run compile`
- `npm run deploy:sepolia`
- `npm run frontend:dev`

## Criterios de aceptacion

- La instalacion de dependencias deja `package-lock.json`.
- `npm run compile` compila el contrato base.
- `npm run deploy:sepolia` existe y carga Sepolia desde `.env`.
- Los agentes no deben usar `npm run frontend:build` ni otros comandos frontend como validacion salvo pedido explicito del usuario.
- `.env` esta ignorado y `.env.example` explica las variables.
- `README.md`, `.agents/` y `.skills/` documentan el flujo para futuros agentes.
