import { getActiveEthereum, type EthereumProvider } from './ethereumProvider'
import { getPublicRpcUrl } from './publicProvider'

export const EXPECTED_SEPOLIA_CHAIN_ID = import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? '11155111'

export function getSepoliaChainHex(): string {
  return `0x${Number(EXPECTED_SEPOLIA_CHAIN_ID).toString(16)}`
}

export function parseWalletChainId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return Number.parseInt(raw, 16).toString()
}

const SEPOLIA_CHAIN_CONFIG = {
  chainId: getSepoliaChainHex(),
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [getPublicRpcUrl()],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
}

function getErrorCode(error: unknown): number | string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null
  return (error as { code?: number | string }).code ?? null
}

function isUserRejected(error: unknown): boolean {
  const code = getErrorCode(error)
  if (code === 4001 || code === '4001') return true
  return error instanceof Error && error.message.toLowerCase().includes('user rejected')
}

function getProvider(provider?: EthereumProvider | null): EthereumProvider {
  const eth = provider ?? getActiveEthereum()
  if (!eth) {
    throw new Error('Conecta MetaMask para operar en Sepolia.')
  }
  return eth
}

export async function switchProviderToSepolia(provider?: EthereumProvider | null): Promise<string> {
  const eth = getProvider(provider)

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: getSepoliaChainHex() }],
    })
  } catch (error) {
    if (isUserRejected(error)) {
      throw new Error('Cambio a Sepolia cancelado en MetaMask.')
    }

    const code = getErrorCode(error)
    if (code !== 4902 && code !== '4902') {
      throw error
    }

    try {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [SEPOLIA_CHAIN_CONFIG],
      })
    } catch (addError) {
      if (isUserRejected(addError)) {
        throw new Error('Alta de Sepolia cancelada en MetaMask.')
      }
      throw addError
    }
  }

  return parseWalletChainId(await eth.request({ method: 'eth_chainId' }))
}

export async function switchActiveProviderToSepolia(provider?: EthereumProvider | null): Promise<boolean> {
  const chainId = await switchProviderToSepolia(provider)
  return chainId === EXPECTED_SEPOLIA_CHAIN_ID
}

export async function ensureSepoliaWalletReady(provider?: EthereumProvider | null): Promise<{
  address: string
  chainId: string
}> {
  const eth = getProvider(provider)

  let accounts: string[]
  try {
    accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
  } catch (error) {
    if (isUserRejected(error)) {
      throw new Error('Conexion de wallet cancelada en MetaMask.')
    }
    throw error
  }

  const address = accounts[0] ?? ''
  if (!address) {
    throw new Error('MetaMask no devolvio una cuenta activa.')
  }

  let chainId = parseWalletChainId(await eth.request({ method: 'eth_chainId' }))
  if (chainId !== EXPECTED_SEPOLIA_CHAIN_ID) {
    chainId = await switchProviderToSepolia(eth)
  }

  if (chainId !== EXPECTED_SEPOLIA_CHAIN_ID) {
    throw new Error('MetaMask sigue en otra red. Cambia a Sepolia para operar.')
  }

  return { address, chainId }
}
