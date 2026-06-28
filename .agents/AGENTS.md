# CarPass Agent Guide

## Proyecto

CarPass es un sistema de trazabilidad vehicular sobre blockchain. Cada auto sera un NFT ERC-721 asociado a su VIN. El contrato acumulara historial tecnico inmutable: services, kilometraje, VTV, siniestros y transferencias. La DApp permitira consultar el sello de calidad por VIN sin wallet y operar funciones privadas con MetaMask segun rol.

## Arquitectura objetivo

- Contrato en Sepolia: ERC-721 + AccessControl + reglas de hitos + sello de calidad.
- DApp en React: Vite + TypeScript + ethers.
- Hardhat en raiz: contratos y scripts de deploy.
- Frontend aislado en `frontend/`.

## Reglas para agentes

- Trabajar por SDD: escribir spec detallada antes de implementar una epica.
- Congelar interfaz del contrato antes de construir pantallas dependientes del ABI.
- Si se hacen commits, no incluir `Co-authored-by:` ni ningun trailer de coautoria.
- No agregar, adjuntar ni sugerir tests salvo pedido explicito del usuario en ese turno o trabajo directo sobre EPIC-07.
- No ejecutar validaciones frontend: build, lint, e2e, Playwright o audit de `frontend`, salvo pedido explicito del usuario en ese turno.
- No commitear secretos. Usar `.env` local y mantener `.env.example`.
- Validar solo superficies no frontend, por ejemplo `npm run compile` para contrato.
- Mantener cambios chicos y explicables. No mezclar refactors ajenos a la epica.

## Orden recomendado de epicas

1. EPIC-02: contrato madre y modelo de dominio.
2. EPIC-03: mint de vehiculos y VIN.
3. EPIC-04: roles y permisos.
4. EPIC-05: reglas de consistencia.
5. EPIC-06: sello de calidad.
6. EPIC-07: contract test suite.
7. EPIC-08: deploy Sepolia y ABI estable.
8. EPIC-09: frontend scaffold, wallet y ruteo por rol.
9. EPIC-10: capa de integracion con contrato.
10. EPIC-11: formularios por rol.
11. EPIC-12: QR descartado del alcance actual.
12. EPIC-13: IPFS descartado del alcance actual.
