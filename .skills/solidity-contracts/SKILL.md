# Solidity Contracts Skill - CarPass

Use esta skill para cambios en `contracts/` o `scripts/`.

## Convenciones

- Solidity `^0.8.28`.
- OpenZeppelin para ERC-721 y AccessControl.
- Usar ERC721 para identidad del vehiculo y AccessControl para actores.
- Preferir custom errors para validaciones de dominio.
- Emitir eventos para cada hito relevante.
- Mantener consultas publicas simples para el frontend y QR.

## Verificacion

- Compilar con `npm run compile`.
- Si se cambia deploy, revisar `scripts/deploy.ts` y variables en `.env.example`.
- Documentar reglas de rechazo en la spec antes de implementarlas.
- No agregar tests de contrato salvo pedido explicito del usuario.

## Modelado minimo antes de codear

- Enumerar roles y quien puede ejecutar cada funcion.
- Definir eventos antes de mutar almacenamiento.
- Definir como se consulta por VIN y por tokenId.
- Definir reglas de rechazo con nombre de custom error.

## Seguridad basica

- No guardar VIN o datos sensibles que no deban ser publicos.
- Validar roles antes de mutar estado.
- Evitar loops no acotados en funciones publicas.
