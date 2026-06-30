# Public Read Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the EPIC-14 public read orchestration so the defense can show live Sepolia reads with snapshot/demo fallback.

**Architecture:** Add a small public read domain layer in `frontend/src/domain/carpass/publicRead.ts` plus `usePublicVehicleLookup`. Add `scripts/sync-public-snapshot.mjs` to export public Sepolia data into `frontend/src/data/publicVehicleSnapshot.json`. Wire `PublicView`, `RuntimeStrip`, and `package.json` to expose source state and defense commands.

**Tech Stack:** Vite, React, TypeScript, ethers v6, Hardhat artifacts, JSON snapshot.

---

### Task 1: Snapshot Script And Metadata

**Files:**
- Create: `scripts/sync-public-snapshot.mjs`
- Create: `frontend/src/data/publicVehicleSnapshot.json`
- Modify: `package.json`

- [ ] **Step 1: Add a read-only Sepolia snapshot script**

Create a Node ESM script that loads `dotenv/config`, resolves the contract address from env or `deployments/sepolia/CarPass.json`, loads the compiled ABI, reads the official demo VINs, normalizes bigint values to strings/numbers, and writes `frontend/src/data/publicVehicleSnapshot.json`.

- [ ] **Step 2: Add root commands**

Add:

```json
"sync:public-snapshot": "node scripts/sync-public-snapshot.mjs",
"defense:prepare": "npm run deploy:check && npm run verify:deployment && npm run sync:public-snapshot"
```

- [ ] **Step 3: Seed a safe empty snapshot**

Commit a non-secret JSON file with metadata and an empty `vehicles` map so the frontend imports even before the first sync.

### Task 2: Public Read Domain

**Files:**
- Create: `frontend/src/domain/carpass/publicRead.ts`
- Create: `frontend/src/hooks/usePublicVehicleLookup.ts`

- [ ] **Step 1: Define normalized public read types**

Expose `VehicleReadSource`, `PublicVehicleRecord`, `PublicReadStatus`, and `PublicReadResult`.

- [ ] **Step 2: Implement live/snapshot/demo lookup**

Use existing `useCarPass` read functions for live reads, imported JSON for snapshot fallback, and `DEMO_VEHICLES` for final demo fallback. Keep wallet out of the public read path.

- [ ] **Step 3: Implement hook state**

Expose `search`, `loading`, `loadingVin`, `error`, `status`, `data`, and `reset`.

### Task 3: Public UI Wiring

**Files:**
- Modify: `frontend/src/views/PublicView.tsx`
- Modify: `frontend/src/components/RuntimeStrip.tsx`
- Modify: `frontend/src/App.css`

- [ ] **Step 1: Replace direct public reads**

Remove `useCarPass` from `PublicView` public lookup and use `usePublicVehicleLookup`.

- [ ] **Step 2: Show source badges**

Render `Live Sepolia`, `Snapshot Sepolia`, or `Demo local` in the result. Only say verified on-chain for `live`; say synchronized from Sepolia for `snapshot`; say demo local for `demo`.

- [ ] **Step 3: Show defense infrastructure**

Add snapshot metadata to `RuntimeStrip`: contract address, RPC, source capability, and snapshot sync date.

### Task 4: Verification

**Files:**
- Read: `docs/sdd/EPIC-14-public-read-orchestration-defense-mode.md`
- Read: `.agents/backlog.md`

- [ ] **Step 1: Run allowed contract checks**

Run:

```bash
npm run compile
```

- [ ] **Step 2: Run snapshot sync**

Run:

```bash
npm run sync:public-snapshot
```

If network credentials are unavailable, report the exact failure and leave the committed empty snapshot in place.

- [ ] **Step 3: Do not run frontend validation**

Do not run `frontend:build`, lint, e2e, Playwright, or frontend audit unless the user explicitly asks.
