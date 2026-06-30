# Transfer Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep CarPass vehicle ownership synchronized whether transfers happen inside the app or through an external wallet.

**Architecture:** Use the ERC-721 `Transfer` event as a refresh trigger and `ownerOf(tokenId)` as the only source of truth. Initial fleet reads still query historical inbound transfers, then filter by current owner; live sync polls only new transfer logs for the connected wallet and active transfer sheet token.

**Tech Stack:** React, TypeScript, ethers v6, Vite.

---

### Task 1: Spec Update

**Files:**
- Modify: `docs/sdd/EPIC-17-cambio-dominio-operativo.md`

- [x] Document external wallet transfers, automatic refresh, and `ownerOf` revalidation.

### Task 2: Transfer Event Monitor

**Files:**
- Modify: `frontend/src/lib/fleetRead.ts`

- [x] Add a focused transfer monitor that starts at the latest block, polls new logs only, listens for browser focus, and reports whether the connected wallet was sender or receiver.

### Task 3: Fleet Hook Integration

**Files:**
- Modify: `frontend/src/hooks/useMisVehiculos.ts`

- [x] Subscribe the garage to transfer updates for the connected wallet and refresh silently so vehicles disappear or appear after external transfers.

### Task 4: Transfer Sheet Integration

**Files:**
- Modify: `frontend/src/components/TransferDominioSheet.tsx`

- [x] Revalidate the open transfer sheet when its token emits a new `Transfer`, so an externally transferred vehicle becomes read-only immediately.

### Task 5: Verification

**Commands:**
- `git diff --check -- frontend/src/lib/fleetRead.ts frontend/src/hooks/useMisVehiculos.ts frontend/src/components/TransferDominioSheet.tsx docs/sdd/EPIC-17-cambio-dominio-operativo.md`

No frontend build, lint, e2e, Playwright, or frontend audit per repo policy.
