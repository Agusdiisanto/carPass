# CarPass Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial Hardhat + Vite infrastructure for CarPass.

**Architecture:** Hardhat lives at the repo root with Solidity contracts and deploy scripts. The React DApp lives in `frontend/` and consumes contract data through ethers in later epics.

**Tech Stack:** Solidity, Hardhat, OpenZeppelin, ethers, dotenv, TypeScript, Vite, React.

---

### Task 1: Root Package And Dependencies

**Files:**
- Create: `package.json`
- Create: `package-lock.json`

- [ ] Initialize npm in the repository with `npm init -y`.
- [ ] Install dev dependencies: `hardhat`, `@nomicfoundation/hardhat-ethers`, `typescript`, `tsx`, `dotenv`.
- [ ] Install runtime dependency: `@openzeppelin/contracts`.
- [ ] Add scripts for compile, deploy, clean, node and frontend forwarding.

### Task 2: Hardhat Configuration

**Files:**
- Create: `hardhat.config.ts`
- Create: `tsconfig.json`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] Configure Solidity compiler.
- [ ] Configure Sepolia network from `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY`.
- [ ] Ignore `.env`, artifacts, cache, node modules and build outputs.

### Task 3: Contract Placeholder

**Files:**
- Create: `contracts/CarPass.sol`

- [ ] Implement the minimal `CarPass` contract using ERC721 and AccessControl.
- [ ] Compile the contract with `npm run compile`.

### Task 4: Deploy Script

**Files:**
- Create: `scripts/deploy.ts`

- [ ] Add a deploy script that deploys `CarPass` and prints the address.
- [ ] Ensure `npm run deploy:sepolia` routes to `hardhat run scripts/deploy.ts --network sepolia`.

### Task 5: Frontend Base

**Files:**
- Create: `frontend/`

- [ ] Scaffold Vite React TypeScript in `frontend/`.
- [ ] Install `ethers` in `frontend/`.
- [ ] Replace starter UI with a small CarPass status shell that reads env values.
- [ ] Do not run frontend validation unless the user explicitly asks.

### Task 6: Agent Documentation

**Files:**
- Create: `.agents/AGENTS.md`
- Create: `.agents/backlog.md`
- Create: `.skills/sdd/SKILL.md`
- Create: `.skills/solidity-contracts/SKILL.md`
- Create: `.skills/frontend-dapp/SKILL.md`
- Modify: `README.md`

- [ ] Document project goal, stack, commands and workflow.
- [ ] Document SDD-first backlog usage.
- [ ] Document contract and frontend conventions for future agents.

### Verification

- [ ] Run `npm run compile`.
- [ ] Do not run frontend validation unless the user explicitly asks.
- [ ] Run `git status --short` and summarize changed files.
