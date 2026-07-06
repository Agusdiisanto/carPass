import { BrowserProvider, Contract, isAddress, type Provider } from 'ethers'
import { CARPASS_ABI } from '../contracts/carpassAbi'
import { getActiveEthereum } from './ethereumProvider'
import { getPublicProvider } from './publicProvider'

const ABI = CARPASS_ABI

function resolveLogFromBlock(): number {
  const configured = import.meta.env.VITE_CARPASS_DEPLOY_BLOCK
  if (typeof configured === 'string' && /^\d+$/.test(configured.trim())) {
    return Number(configured.trim())
  }
  return 0
}

const LOG_FROM_BLOCK = resolveLogFromBlock()
const TRANSFER_SYNC_POLL_MS = 6_000
const LOG_QUERY_WINDOW = 250_000
const MIN_LOG_QUERY_WINDOW = 5_000

type FleetLogProvider = {
  provider: Provider
  label: 'wallet' | 'rpc'
}

function getLogProviders(): FleetLogProvider[] {
  const providers: FleetLogProvider[] = []
  const eth = getActiveEthereum()
  if (eth) providers.push({ provider: new BrowserProvider(eth as never), label: 'wallet' })
  const publicProvider = getPublicProvider()
  providers.push({ provider: publicProvider, label: 'rpc' })
  return providers
}

function parseTransferTokenIds(events: unknown[]): bigint[] {
  return [
    ...new Set(
      events.map(
        (event) => (event as { args: { tokenId: bigint } }).args.tokenId,
      ),
    ),
  ]
}

type TransferLog = {
  args: {
    from: string
    to: string
    tokenId: bigint
  }
  blockNumber: number
  transactionHash: string
}

export type FleetTransferUpdate = {
  direction: 'incoming' | 'outgoing'
  tokenId: bigint
  from: string
  to: string
  blockNumber: number
  txHash: string
}

function normalizeTransferLog(event: unknown): FleetTransferUpdate | null {
  const parsed = event as Partial<TransferLog>
  if (!parsed.args || typeof parsed.blockNumber !== 'number') return null
  return {
    direction: 'incoming',
    tokenId: parsed.args.tokenId,
    from: parsed.args.from,
    to: parsed.args.to,
    blockNumber: parsed.blockNumber,
    txHash: parsed.transactionHash ?? '',
  }
}

function uniqueTransferUpdates(events: unknown[], ownerAddress: string): FleetTransferUpdate[] {
  const owner = ownerAddress.toLowerCase()
  const seen = new Set<string>()
  const updates: FleetTransferUpdate[] = []

  for (const event of events) {
    const update = normalizeTransferLog(event)
    if (!update) continue

    const key = `${update.txHash}:${update.blockNumber}:${String(update.tokenId)}`
    if (seen.has(key)) continue
    seen.add(key)

    updates.push({
      ...update,
      direction: update.to.toLowerCase() === owner ? 'incoming' : 'outgoing',
    })
  }

  return updates
}

type QueryFilter = Parameters<Contract['queryFilter']>[0]

async function queryFilterRange(
  contract: Contract,
  filter: QueryFilter,
  fromBlock: number,
  toBlock: number,
): Promise<unknown[]> {
  if (fromBlock > toBlock) return []

  try {
    return await contract.queryFilter(filter, fromBlock, toBlock)
  } catch (error) {
    const range = toBlock - fromBlock + 1
    if (range <= MIN_LOG_QUERY_WINDOW) throw error

    const midpoint = fromBlock + Math.floor(range / 2) - 1
    const [left, right] = await Promise.all([
      queryFilterRange(contract, filter, fromBlock, midpoint),
      queryFilterRange(contract, filter, midpoint + 1, toBlock),
    ])
    return [...left, ...right]
  }
}

async function queryFilterWindowed(
  provider: Provider,
  contract: Contract,
  filter: QueryFilter,
): Promise<unknown[]> {
  const latestBlock = await provider.getBlockNumber()
  if (latestBlock < LOG_FROM_BLOCK) return []

  const events: unknown[] = []
  for (let fromBlock = LOG_FROM_BLOCK; fromBlock <= latestBlock; fromBlock += LOG_QUERY_WINDOW) {
    const toBlock = Math.min(fromBlock + LOG_QUERY_WINDOW - 1, latestBlock)
    const windowEvents = await queryFilterRange(contract, filter, fromBlock, toBlock)
    events.push(...windowEvents)
  }
  return events
}

export function subscribeFleetTransferUpdates(
  contractAddress: string,
  ownerAddress: string,
  onUpdate: (updates: FleetTransferUpdate[]) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  if (!isAddress(contractAddress) || !isAddress(ownerAddress)) return () => {}

  const provider = getPublicProvider()
  const contract = new Contract(contractAddress, ABI, provider)
  const incomingFilter = contract.filters.Transfer(null, ownerAddress)
  const outgoingFilter = contract.filters.Transfer(ownerAddress, null)

  let cancelled = false
  let checking = false
  let lastSeenBlock: number | null = null

  async function checkNewTransfers() {
    if (cancelled || checking) return
    checking = true

    try {
      const latestBlock = await provider.getBlockNumber()
      if (lastSeenBlock === null) {
        lastSeenBlock = latestBlock
        return
      }

      if (latestBlock <= lastSeenBlock) return

      const fromBlock = lastSeenBlock + 1
      const [incoming, outgoing] = await Promise.all([
        contract.queryFilter(incomingFilter, fromBlock, latestBlock),
        contract.queryFilter(outgoingFilter, fromBlock, latestBlock),
      ])

      lastSeenBlock = latestBlock

      const updates = uniqueTransferUpdates([...incoming, ...outgoing], ownerAddress)
      if (updates.length > 0 && !cancelled) onUpdate(updates)
    } catch {
      // La siguiente vuelta de polling vuelve a intentar con el mismo rango.
    } finally {
      checking = false
    }
  }

  const intervalId = window.setInterval(() => {
    void checkNewTransfers()
  }, TRANSFER_SYNC_POLL_MS)

  const handleFocus = () => {
    void checkNewTransfers()
  }

  window.addEventListener('focus', handleFocus)
  document.addEventListener('visibilitychange', handleFocus)
  void checkNewTransfers()

  return () => {
    cancelled = true
    window.clearInterval(intervalId)
    window.removeEventListener('focus', handleFocus)
    document.removeEventListener('visibilitychange', handleFocus)
  }
}

export async function queryTransferEventsToAddress(
  contractAddress: string,
  ownerAddress: string,
): Promise<{ tokenIds: bigint[]; provider: Provider; providerLabel: string }> {
  const providers = getLogProviders()
  let lastError: Error | null = null

  for (const { provider, label } of providers) {
    try {
      const contract = new Contract(contractAddress, ABI, provider)
      const filter = contract.filters.Transfer(null, ownerAddress)
      const events = await queryFilterWindowed(provider, contract, filter)
      return { tokenIds: parseTransferTokenIds(events), provider, providerLabel: label }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError ?? new Error('No se pudieron leer eventos Transfer del contrato.')
}

export async function queryTransferEventsForToken(
  contractAddress: string,
  tokenId: bigint,
): Promise<{ events: unknown[]; provider: Provider; providerLabel: string }> {
  const providers = getLogProviders()
  let lastError: Error | null = null

  for (const { provider, label } of providers) {
    try {
      const contract = new Contract(contractAddress, ABI, provider)
      const filter = contract.filters.Transfer(null, null, tokenId)
      const events = await queryFilterWindowed(provider, contract, filter)
      return { events, provider, providerLabel: label }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError ?? new Error('No se pudo leer el historial de transferencias.')
}

export function describeFleetReadError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('metamask') || message.includes('provider')) {
      return 'Conectá MetaMask en Sepolia para detectar tu flota NFT.'
    }
    if (message.includes('timeout') || message.includes('rate') || message.includes('log')) {
      return 'El nodo RPC no devolvió el historial. Probá de nuevo con MetaMask conectado en Sepolia.'
    }
    if (message.includes('network') || message.includes('chain')) {
      return 'Cambiá a Sepolia en MetaMask y volvé a intentar.'
    }
    return error.message
  }
  return 'No se pudo leer tu flota on-chain.'
}
