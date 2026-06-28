# CarPass Agent Entry Point

This is the first file an agent should read in this repository.

## Mission

Build CarPass with spec-driven development. CarPass represents each vehicle as an ERC-721 NFT linked to its VIN and stores an immutable technical history: services, mileage, VTV, accidents and transfers. The contract validates consistency rules and exposes a quality seal that can be queried through a QR flow without requiring a wallet.

## Required Reading Order

1. `.agents/context-map.md`
2. `.agents/AGENTS.md`
3. `.agents/backlog.md`
4. Relevant local skill under `.skills/`
5. Existing spec in `docs/sdd/` or write a new one before implementation

## Local Skills

- `.skills/sdd/SKILL.md`: use before turning any epic into code.
- `.skills/solidity-contracts/SKILL.md`: use for `contracts/` and `scripts/`.
- `.skills/frontend-dapp/SKILL.md`: use for `frontend/`.
- `.skills/security/SKILL.md`: use before changing roles, secrets, deploy or trust boundaries.
- `.skills/verification/SKILL.md`: use before saying work is complete.

## Installed Global Skills

The following Codex skills were installed into the user skill directory and require restarting Codex to become available in future sessions:

- `security-best-practices`
- `security-threat-model`

## Commands

```bash
npm run compile
npm audit --audit-level=high
```

## Non-Negotiables

- Do not commit secrets.
- Keep `.env` local and update `.env.example` when variables change.
- Do not include commit co-author trailers. Commit messages must not contain `Co-authored-by:` or similar co-author lines.
- Do not add, attach, scaffold or propose tests unless the user explicitly asks in the current turn or the work is EPIC-07.
- Do not run frontend validations: no frontend build, lint, e2e, Playwright or frontend audit unless the user explicitly asks in the current turn.
- Write the SDD before implementation.
- Contract ABI changes must be documented before frontend work depends on them.
- Verify with real commands and report exact failures if something cannot run.
