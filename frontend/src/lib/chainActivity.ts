import { ZeroAddress, isAddress } from 'ethers'
import { CARPASS_ABI } from '../contracts/carpassAbi'
import { CARPASS_DEPLOYMENT } from '../contracts/carpassDeployment'
import { getPublicProvider } from './publicProvider'

function resolveContractAddress() {
  const envAddress = import.meta.env.VITE_CARPASS_CONTRACT_ADDRESS
  if (envAddress && envAddress !== ZeroAddress) return envAddress
  return CARPASS_DEPLOYMENT.address
}

const CONTRACT_ADDRESS = resolveContractAddress()
const hasContractAddress = isAddress(CONTRACT_ADDRESS)

export type ChainActivityKind =
  | 'wallet_connect'
  | 'wallet_disconnect'
  | 'network_warn'
  | 'mint_vehicle'
  | 'transfer_nft'
  | 'service'
  | 'siniestro'
  | 'vtv'
  | 'grant_role'
  | 'revoke_role'
  | 'contract_read'
  | 'tx_failed'

export type ChainActivityStatus = 'pending' | 'confirmed' | 'failed'

export type ChainActivityEntry = {
  id: string
  at: number
  walletAddress: string
  kind: ChainActivityKind
  status: ChainActivityStatus
  title: string
  detail?: string
  method?: string
  txHash?: string
  blockNumber?: number
  counterparty?: string
  vin?: string
}

const STORAGE_PREFIX = 'carpass_chain_activity_'
const MAX_ENTRIES = 40

type Listener = () => void

let entries: ChainActivityEntry[] = []
const listeners = new Set<Listener>()
let activeWallet = ''

function notify() {
  listeners.forEach((listener) => listener())
}

function storageKey(address: string) {
  return `${STORAGE_PREFIX}${address.toLowerCase()}`
}

function persist() {
  if (!activeWallet || typeof window === 'undefined') return
  try {
    const scoped = entries
      .filter((entry) => entry.walletAddress.toLowerCase() === activeWallet.toLowerCase())
      .slice(0, MAX_ENTRIES)
    sessionStorage.setItem(storageKey(activeWallet), JSON.stringify(scoped))
  } catch {
    // sessionStorage no disponible.
  }
}

function loadPersisted(address: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(storageKey(address))
    if (!raw) return
    const parsed = JSON.parse(raw) as ChainActivityEntry[]
    if (!Array.isArray(parsed)) return
    entries = parsed
  } catch {
    // ignore corrupt cache
  }
}

export function setActiveWalletAddress(address: string) {
  activeWallet = address
  if (address) loadPersisted(address)
  notify()
}

export function subscribeChainActivity(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getChainActivities(): ChainActivityEntry[] {
  return entries
}

export function getSepoliaTxUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`
}

export function getSepoliaAddressUrl(address: string): string {
  return `https://sepolia.etherscan.io/address/${address}`
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function prependEntry(entry: ChainActivityEntry) {
  entries = [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, MAX_ENTRIES)
  persist()
  notify()
}

export function recordChainActivity(
  partial: Omit<ChainActivityEntry, 'id' | 'at'> & { id?: string; at?: number },
): string {
  const id = partial.id ?? createId()
  const entry: ChainActivityEntry = {
    id,
    at: partial.at ?? Date.now(),
    walletAddress: partial.walletAddress,
    kind: partial.kind,
    status: partial.status,
    title: partial.title,
    detail: partial.detail,
    method: partial.method,
    txHash: partial.txHash,
    blockNumber: partial.blockNumber,
    counterparty: partial.counterparty,
    vin: partial.vin,
  }
  prependEntry(entry)
  return id
}

export function updateChainActivity(
  id: string,
  patch: Partial<Omit<ChainActivityEntry, 'id' | 'at' | 'walletAddress'>>,
) {
  entries = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
  persist()
  notify()
}

export function mergeHydratedActivities(
  walletAddress: string,
  hydrated: ChainActivityEntry[],
) {
  if (hydrated.length === 0) return
  const existingHashes = new Set(entries.map((entry) => entry.txHash).filter(Boolean))
  const novel = hydrated.filter(
    (entry) =>
      entry.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
      entry.txHash &&
      !existingHashes.has(entry.txHash),
  )
  if (novel.length === 0) return
  entries = [...novel, ...entries]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ENTRIES)
  persist()
  notify()
}

export async function hydrateCarPassActivities(walletAddress: string): Promise<void> {
  if (!hasContractAddress || !walletAddress) return

  try {
    const { Contract } = await import('ethers')
    const provider = getPublicProvider()
    const contract = new Contract(CONTRACT_ADDRESS, CARPASS_ABI, provider)

    const [
      mintedAsOwner,
      mintedAsRegistrar,
      transferFrom,
      transferTo,
    ] = await Promise.all([
      contract.queryFilter(contract.filters.VehicleMinted(null, walletAddress, null), 0).catch(() => []),
      contract.queryFilter(contract.filters.VehicleMinted(null, null, walletAddress), 0).catch(() => []),
      contract.queryFilter(contract.filters.Transfer(walletAddress, null, null), 0).catch(() => []),
      contract.queryFilter(contract.filters.Transfer(null, walletAddress, null), 0).catch(() => []),
    ])

    type ParsedLog = {
      txHash?: string
      blockNumber?: number
      at: number
      kind: ChainActivityKind
      title: string
      detail?: string
      vin?: string
      counterparty?: string
    }

    const parsed: ParsedLog[] = []

    for (const log of mintedAsOwner) {
      const args = (log as { args?: { vin?: string } }).args
      parsed.push({
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        at: log.blockNumber * 1000,
        kind: 'mint_vehicle',
        title: 'Alta de vehículo (NFT)',
        detail: args?.vin ? `VIN ${args.vin}` : undefined,
        vin: args?.vin,
        counterparty: CONTRACT_ADDRESS,
      })
    }

    for (const log of mintedAsRegistrar) {
      const args = (log as { args?: { vin?: string } }).args
      parsed.push({
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        at: log.blockNumber * 1000,
        kind: 'mint_vehicle',
        title: 'Registraste un vehículo',
        detail: args?.vin ? `VIN ${args.vin}` : undefined,
        vin: args?.vin,
        counterparty: CONTRACT_ADDRESS,
      })
    }

    for (const log of transferFrom) {
      const args = (log as { args?: { to?: string; tokenId?: bigint } }).args
      parsed.push({
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        at: log.blockNumber * 1000,
        kind: 'transfer_nft',
        title: 'Transferiste un NFT',
        detail: args?.tokenId != null ? `Token #${String(args.tokenId)}` : undefined,
        counterparty: args?.to,
      })
    }

    for (const log of transferTo) {
      const args = (log as { args?: { from?: string; tokenId?: bigint } }).args
      if (args?.from?.toLowerCase() === walletAddress.toLowerCase()) continue
      parsed.push({
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        at: log.blockNumber * 1000,
        kind: 'transfer_nft',
        title: 'Recibiste un NFT',
        detail: args?.tokenId != null ? `Token #${String(args.tokenId)}` : undefined,
        counterparty: args?.from,
      })
    }

    const hydrated: ChainActivityEntry[] = parsed
      .filter((item) => item.txHash)
      .sort((a, b) => b.at - a.at)
      .slice(0, 20)
      .map((item) => ({
        id: `hydrate-${item.txHash}`,
        at: item.at,
        walletAddress,
        kind: item.kind,
        status: 'confirmed' as const,
        title: item.title,
        detail: item.detail,
        method: item.kind === 'mint_vehicle' ? 'registrarVehiculo' : 'transferFrom',
        txHash: item.txHash,
        blockNumber: item.blockNumber,
        counterparty: item.counterparty ?? CONTRACT_ADDRESS,
        vin: item.vin,
      }))

    mergeHydratedActivities(walletAddress, hydrated)
  } catch {
    // hidratación best-effort
  }
}

export const KIND_LABELS: Record<ChainActivityKind, string> = {
  wallet_connect: 'Wallet',
  wallet_disconnect: 'Wallet',
  network_warn: 'Red',
  mint_vehicle: 'Alta NFT',
  transfer_nft: 'Transfer',
  service: 'Service',
  siniestro: 'Siniestro',
  vtv: 'VTV',
  grant_role: 'Rol',
  revoke_role: 'Rol',
  contract_read: 'Contrato',
  tx_failed: 'Error',
}
