# Verification Skill - CarPass

Use this skill before reporting that a task is complete.

## Required Evidence

For contract changes:

```bash
npm run compile
```

For frontend changes:

No ejecutar validaciones frontend. No correr build, lint, e2e, Playwright ni audit de `frontend` salvo pedido explicito del usuario.

For dependency or setup changes:

```bash
npm audit --audit-level=high
```

## Reporting

State exactly what ran and whether it passed. If a command cannot run, include the command and the blocking error.

## Commit Messages

If a commit is created, do not include `Co-authored-by:` or any co-author trailer. If commit metadata is reviewed, confirm the created commit message is free of co-author trailers.
