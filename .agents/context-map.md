# CarPass Context Map

## Start Here

- `AGENTS.md`: root entry point for any agent.
- `.agents/AGENTS.md`: project mission, architecture and epics.
- `.agents/backlog.md`: ordered backlog and dependencies.
- `README.md`: human setup guide.

## Implementation Areas

- `contracts/CarPass.sol`: current placeholder contract.
- `scripts/deploy.ts`: Sepolia deploy script.
- `frontend/src/App.tsx`: current DApp shell.

## Spec Areas

- `docs/sdd/`: product and epic specs.
- `docs/superpowers/specs/`: infrastructure design history.
- `docs/superpowers/plans/`: implementation plans.

## Skill Routing

- New epic: read `.skills/sdd/SKILL.md`.
- Solidity change: read `.skills/solidity-contracts/SKILL.md`.
- React/ethers change: read `.skills/frontend-dapp/SKILL.md`.
- Permissions, secrets or deploy: read `.skills/security/SKILL.md`.
- Final answer: read `.skills/verification/SKILL.md`.

## User Constraint

Do not add tests. Do not run frontend validation commands unless the user explicitly asks in the current turn.

Commit messages must not include `Co-authored-by:` or any co-author trailer.
