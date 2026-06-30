import { BrowserProvider, Contract, type Provider } from 'ethers'
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

function getLogProviders(): Provider[] {
  const providers: Provider[] = []
  const eth = getActiveEthereum()
  if (eth) providers.push(new BrowserProvider(eth as never))
  const publicProvider = getPublicProvider()
  if (!providers.includes(publicProvider)) providers.push(publicProvider)
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

export async function queryTransferEventsToAddress(
  contractAddress: string,
  ownerAddress: string,
): Promise<{ tokenIds: bigint[]; providerLabel: string }> {
  const providers = getLogProviders()
  let lastError: Error | null = null

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index]
    const providerLabel = index === 0 && getActiveEthereum() ? 'wallet' : 'rpc'
    try {
      const contract = new Contract(contractAddress, ABI, provider)
      const filter = contract.filters.Transfer(null, ownerAddress)
      const events = await contract.queryFilter(filter, LOG_FROM_BLOCK)
      return { tokenIds: parseTransferTokenIds(events), providerLabel }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError ?? new Error('No se pudieron leer eventos Transfer del contrato.')
}

export async function queryTransferEventsForToken(
  contractAddress: string,
  tokenId: bigint,
): Promise<unknown[]> {
  const providers = getLogProviders()
  let lastError: Error | null = null

  for (const provider of providers) {
    try {
      const contract = new Contract(contractAddress, ABI, provider)
      const filter = contract.filters.Transfer(null, null, tokenId)
      return await contract.queryFilter(filter, LOG_FROM_BLOCK)
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
