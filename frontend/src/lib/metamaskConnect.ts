import { createEVMClient, type MetamaskConnectEVM } from '@metamask/connect-evm'
import type { EthereumProvider } from './ethereumProvider'
import { getEffectivePublicAppUrl, getPublicAppOrigin } from './publicAppUrl'
import { getPublicRpcUrl } from './publicProvider'

const MAINNET_HEX = '0x1' as const

let clientPromise: Promise<MetamaskConnectEVM> | null = null
let cachedConnectProvider: EthereumProvider | null = null

function getSepoliaChainHex(): `0x${string}` {
  const chainId = import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? '11155111'
  return `0x${Number(chainId).toString(16)}`
}

function resolveDappUrl(): string {
  return getEffectivePublicAppUrl() ?? window.location.href
}

async function getConnectClient(): Promise<MetamaskConnectEVM> {
  if (!clientPromise) {
    const sepoliaHex = getSepoliaChainHex()
    clientPromise = createEVMClient({
      dapp: {
        name: 'CarPass',
        url: resolveDappUrl(),
        iconUrl: `${getPublicAppOrigin()}/vite.svg`,
      },
      api: {
        supportedNetworks: {
          [MAINNET_HEX]: 'https://ethereum-rpc.publicnode.com',
          [sepoliaHex]: getPublicRpcUrl(),
        },
      },
      ui: {
        headless: true,
        preferExtension: false,
        showInstallModal: false,
      },
      analytics: { enabled: false },
    }).then((client) => {
      cachedConnectProvider = client.getProvider() as unknown as EthereumProvider
      return client
    })
  }
  return clientPromise
}

export function getCachedConnectProvider(): EthereumProvider | null {
  return cachedConnectProvider
}

export async function ensureConnectProvider(): Promise<EthereumProvider | null> {
  if (typeof window === 'undefined') return null
  try {
    await getConnectClient()
    return cachedConnectProvider
  } catch {
    return null
  }
}

export async function connectViaMetaMaskConnect(options?: {
  onDisplayUri?: (uri: string) => void
  forceRequest?: boolean
}): Promise<{ address: string; chainId: string }> {
  const client = await getConnectClient()
  const provider = client.getProvider()
  const sepoliaHex = getSepoliaChainHex()

  const onDisplayUri = (uri: string) => {
    options?.onDisplayUri?.(uri)
  }

  provider.on('display_uri', onDisplayUri)

  try {
    const { accounts, chainId } = await client.connect({
      chainIds: [sepoliaHex],
      forceRequest: options?.forceRequest ?? true,
    })

    return {
      address: accounts[0] ?? '',
      chainId: Number.parseInt(chainId, 16).toString(),
    }
  } finally {
    provider.removeListener('display_uri', onDisplayUri)
  }
}

export async function disconnectMetaMaskConnect(): Promise<void> {
  if (!clientPromise) return
  try {
    const client = await clientPromise
    await client.disconnect()
  } catch {
    // Sesión ya revocada o cliente no inicializado.
  }
}
