# Gas Optimization Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce gas in the autoparts contract while preserving the public ABI used by the frontend.

**Architecture:** Keep `VehicleParts.Parte` as the public response struct and add a compact internal storage struct. Reconstruct public structs in memory for reads, leaving roles, errors, events and frontend calls unchanged.

**Tech Stack:** Solidity 0.8.28, OpenZeppelin ERC-721, Hardhat 3, TypeScript deploy/export scripts.

---

### Task 1: Compact VehicleParts Storage

**Files:**
- Modify: `contracts/VehicleParts.sol`
- Reference: `docs/sdd/EPIC-23-gas-optimization-contracts.md`

- [ ] Add an internal `ParteStorage` struct that omits `vehicleTokenId` and packs fixed-size fields together.
- [ ] Change `_partes` to store `ParteStorage`.
- [ ] Update `_instalarParte` to write the compact struct.
- [ ] Add a private `_partePublica(vehicleTokenId, partTokenId)` helper that reconstructs `Parte memory`.
- [ ] Update `getParteActual`, `getPartesVehiculo` and `getHistorialParte` to return reconstructed public structs.

### Task 2: Synchronize Artifacts

**Files:**
- Generated: `artifacts/`
- Generated: `frontend/src/contracts/vehiclePartsAbi.ts`
- Generated: `frontend/src/contracts/carpassAbi.ts`

- [ ] Run `npm run compile`.
- [ ] Run `npm run export:frontend` because the contract artifact may update even if the ABI shape remains stable.

### Task 3: Verify Allowed Commands

**Files:**
- Read: `package.json`

- [ ] Run `npm run compile`.
- [ ] Run `npm audit --audit-level=high`.
- [ ] Do not run frontend build, lint, e2e, Playwright, or frontend audit.

### Self-Review

- The plan preserves public methods and role checks.
- No tests are added.
- Sepolia redeploy is a documented operational follow-up, not performed without a signer.
