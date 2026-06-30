# Wallet Sepolia Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize wallet connection and Sepolia readiness before every CarPass write operation.

**Architecture:** Add a small `sepoliaGate` utility used by both `useWallet` and `useCarPass`. Reads remain public/provider-based; writes call the gate before resolving a signer.

**Tech Stack:** React, TypeScript, ethers v6, MetaMask provider API.

---

### Task 1: SDD

**Files:**
- Create: `docs/sdd/EPIC-21-wallet-sepolia-gate.md`

- [x] Document the gate, public read separation, expected errors and validation constraints.

### Task 2: Gate Utility

**Files:**
- Create: `frontend/src/lib/sepoliaGate.ts`

- [x] Implement Sepolia chain config, switch/add network, account request and final chain verification.

### Task 3: Wallet Hook Integration

**Files:**
- Modify: `frontend/src/hooks/useWallet.ts`

- [x] Reuse the gate for connect and network switch so UI state follows the same path as write operations.

### Task 4: Contract Write Integration

**Files:**
- Modify: `frontend/src/hooks/useCarPass.ts`
- Modify: `frontend/src/domain/carpass/errors.ts`

- [x] Run the gate before signer creation and map gate errors to short user-facing messages.

### Task 5: Verification

**Commands:**
- `git diff --check -- frontend/src/lib/sepoliaGate.ts frontend/src/hooks/useWallet.ts frontend/src/hooks/useCarPass.ts frontend/src/domain/carpass/errors.ts docs/sdd/EPIC-21-wallet-sepolia-gate.md docs/superpowers/plans/2026-06-30-wallet-sepolia-gate.md`
- `npm run compile`
- `npm audit --audit-level=high`

No frontend build, lint, e2e, Playwright, or frontend audit per repo policy.
