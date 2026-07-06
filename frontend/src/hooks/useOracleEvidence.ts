import { Contract } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CARPASS_ORACLE_ABI } from '../contracts/carPassOracleAbi'
import {
  computeMerkleRoot,
  hasOracleAddress,
  normalizeOracleAttestation,
  normalizeOracleEvidenceBatch,
  resolveOracleAddress,
  resolveOracleLogFromBlock,
  type OracleEvidenceBatch,
  type OracleEvidenceItem,
} from '../domain/carpass/oracleEvidence'
import { getPublicProvider } from '../lib/publicProvider'

type OracleEvidenceState = {
  loading: boolean
  configured: boolean
  error: string
  items: OracleEvidenceItem[]
}

async function withLeafVerification(contract: Contract, batch: OracleEvidenceBatch): Promise<OracleEvidenceBatch> {
  try {
    const fromBlock = resolveOracleLogFromBlock()
    const filter = contract.filters.EvidenceBatchSubmitted(
      batch.id,
      batch.vehicleTokenId,
      batch.kind,
    )
    const logs = await contract.queryFilter(filter, fromBlock > 0 ? fromBlock : undefined)
    const args = (logs[0] as { args?: { leaves?: string[] } } | undefined)?.args
    if (!args?.leaves) return batch

    const leaves = Array.from(args.leaves)
    const recomputedRoot = computeMerkleRoot(leaves)
    return {
      ...batch,
      leafCount: leaves.length,
      rootVerified: recomputedRoot.toLowerCase() === batch.merkleRoot.toLowerCase(),
    }
  } catch {
    return batch
  }
}

async function readOracleAttestations(vehicleTokenId: bigint, address: string) {
  const contract = new Contract(address, CARPASS_ORACLE_ABI, getPublicProvider())
  const [attestationIds, batchIds] = await Promise.all([
    contract.getVehicleAttestationIds(vehicleTokenId) as Promise<string[]>,
    contract.getVehicleEvidenceBatchIds(vehicleTokenId).catch(() => []) as Promise<string[]>,
  ])
  const rows = await Promise.all([
    ...attestationIds.map(async id => normalizeOracleAttestation(id, await contract.attestations(id))),
    ...batchIds.map(async id => {
      const batch = normalizeOracleEvidenceBatch(id, await contract.evidenceBatches(id))
      return withLeafVerification(contract, batch)
    }),
  ])
  return rows.sort((a, b) => Number(b.reportedAt - a.reportedAt))
}

function emptyState(configured: boolean): OracleEvidenceState {
  return {
    loading: false,
    configured,
    error: '',
    items: [],
  }
}

export function useOracleEvidence(vehicleTokenId: bigint | null | undefined) {
  const address = useMemo(() => resolveOracleAddress(), [])
  const configured = hasOracleAddress(address)
  const [state, setState] = useState<OracleEvidenceState>(() => emptyState(configured))

  const refresh = useCallback(async () => {
    if (!vehicleTokenId || !configured) {
      setState(emptyState(configured))
      return
    }

    try {
      setState(current => ({ ...current, loading: true, configured, error: '' }))
      const items = await readOracleAttestations(vehicleTokenId, address)
      setState({ loading: false, configured, error: '', items })
    } catch (error) {
      setState({
        loading: false,
        configured,
        error: error instanceof Error ? error.message : 'No se pudo leer CarPassOracle',
        items: [],
      })
    }
  }, [address, configured, vehicleTokenId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    ...state,
    address,
    refresh,
  }
}
