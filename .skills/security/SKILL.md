# Security Skill - CarPass

Use this skill before changing roles, deploy scripts, environment variables, QR reads, or any contract function that mutates state.

## Threat Boundaries

- Sepolia deploy key: secret, never commit.
- VIN and milestone data: public blockchain data unless future spec hashes or redacts it.
- QR reads: public and walletless.
- Write operations: wallet required and role-gated.

## Solidity Checks

- Enforce AccessControl before state changes.
- Prefer custom errors for reverts.
- Emit events after successful writes.
- Avoid unbounded loops in public functions.
- Document unauthorized callers and inconsistent inputs in the SDD.

## Frontend Checks

- Never ask for wallet connection for public QR reads.
- Validate chain id before transactions.
- Do not expose private keys through `VITE_` variables.
- Show failed transaction errors without leaking internals.

## Verification

Run:

```bash
npm run compile
npm audit --audit-level=high
```

No ejecutar audits ni validaciones del paquete `frontend` salvo pedido explicito del usuario.
