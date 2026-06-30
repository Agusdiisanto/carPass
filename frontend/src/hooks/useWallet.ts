import { useEffect, useState } from 'react'
import {
  getActiveEthereum,
  getInjectedEthereum,
  getWalletConnectionMode,
  hasInjectedEthereum,
  METAMASK_DOWNLOAD_URL,
  openInMetaMaskBrowser,
  waitForEthereumProvider,
  type EthereumProvider,
  type WalletConnectionMode,
} from '../lib/ethereumProvider'
import {
  connectViaMetaMaskConnect,
  disconnectMetaMaskConnect,
  ensureConnectProvider,
} from '../lib/metamaskConnect'

export type WalletState = {
  address: string
  chainId: string
  connected: boolean
}

export const expectedChainId = import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? '11155111'

const WALLET_DISCONNECTED_KEY = 'carpass_wallet_manual_disconnect'

function parseChainId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return Number.parseInt(raw, 16).toString()
}

export function shortAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

function wasManuallyDisconnected(): boolean {
  try {
    return localStorage.getItem(WALLET_DISCONNECTED_KEY) === '1'
  } catch {
    return false
  }
}

function markManuallyDisconnected() {
  try {
    localStorage.setItem(WALLET_DISCONNECTED_KEY, '1')
  } catch {
    // localStorage no disponible.
  }
}

function clearManualDisconnect() {
  try {
    localStorage.removeItem(WALLET_DISCONNECTED_KEY)
  } catch {
    // localStorage no disponible.
  }
}

function bindProviderListeners(
  eth: EthereumProvider,
  onAccountsChanged: (accounts: unknown) => void,
  onChainChanged: (rawChainId: unknown) => void,
) {
  eth.on?.('accountsChanged', onAccountsChanged)
  eth.on?.('chainChanged', onChainChanged)

  return () => {
    eth.removeListener?.('accountsChanged', onAccountsChanged)
    eth.removeListener?.('chainChanged', onChainChanged)
  }
}

async function readWalletState(eth: EthereumProvider): Promise<{ address: string; chainId: string }> {
  const accounts = (await eth.request({ method: 'eth_accounts' })) as string[]
  const chain = parseChainId(await eth.request({ method: 'eth_chainId' }))
  return { address: accounts[0] ?? '', chainId: chain }
}

export function useWallet() {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState('')
  const [restoring, setRestoring] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [pairingUri, setPairingUri] = useState('')
  const [connectError, setConnectError] = useState('')
  const [connectionMode, setConnectionMode] = useState<WalletConnectionMode>(() => getWalletConnectionMode())
  const [providerReady, setProviderReady] = useState(() => hasInjectedEthereum())

  useEffect(() => {
    let cancelled = false
    let unbind: (() => void) | undefined

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? accounts : []
      setAddress(typeof nextAccounts[0] === 'string' ? nextAccounts[0] : '')
    }

    const handleChainChanged = (rawChainId: unknown) => {
      setChainId(parseChainId(rawChainId))
    }

    async function bootstrapProvider() {
      const mode = getWalletConnectionMode()
      setConnectionMode(mode)

      let eth = await waitForEthereumProvider()
      if (!eth && mode === 'desktop-install') {
        eth = await ensureConnectProvider()
      }

      if (cancelled) return

      setProviderReady(Boolean(eth))
      if (!eth) {
        setRestoring(false)
        return
      }

      unbind = bindProviderListeners(eth, handleAccountsChanged, handleChainChanged)

      if (wasManuallyDisconnected()) {
        setRestoring(false)
        return
      }

      try {
        const state = await readWalletState(eth)
        if (cancelled) return
        setAddress(state.address)
        setChainId(state.chainId)
      } catch {
        // MetaMask no autorizado o provider no disponible.
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }

    void bootstrapProvider()

    const onProviderInitialized = () => {
      if (cancelled || hasInjectedEthereum()) return
      void bootstrapProvider()
    }

    window.addEventListener('ethereum#initialized', onProviderInitialized as EventListener)

    return () => {
      cancelled = true
      unbind?.()
      window.removeEventListener('ethereum#initialized', onProviderInitialized as EventListener)
    }
  }, [])

  const connected = Boolean(address && chainId === expectedChainId)
  const wrongNetwork = Boolean(address && chainId && chainId !== expectedChainId)
  const needsMobileWallet = connectionMode === 'mobile-deeplink' && !providerReady

  async function connect(): Promise<boolean> {
    clearManualDisconnect()
    setConnectError('')
    setPairingUri('')

    const mode = getWalletConnectionMode()
    setConnectionMode(mode)

    const injected = getInjectedEthereum() ?? (await waitForEthereumProvider(600))
    setProviderReady(Boolean(injected))

    if (injected) {
      const accounts = (await injected.request({ method: 'eth_requestAccounts' })) as string[]
      const chain = parseChainId(await injected.request({ method: 'eth_chainId' }))
      setAddress(accounts[0] ?? '')
      setChainId(chain)
      return true
    }

    if (mode === 'mobile-deeplink') {
      return openInMetaMaskBrowser()
    }

    if (mode === 'desktop-install') {
      setConnecting(true)
      try {
        const result = await connectViaMetaMaskConnect({
          onDisplayUri: setPairingUri,
          forceRequest: true,
        })
        setAddress(result.address)
        setChainId(result.chainId)
        setPairingUri('')
        setProviderReady(true)
        return Boolean(result.address)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo conectar con MetaMask mobile'
        setConnectError(message)
        return false
      } finally {
        setConnecting(false)
      }
    }

    throw new Error('MetaMask no detectado')
  }

  function openInMetaMaskApp() {
    return openInMetaMaskBrowser()
  }

  function openMetaMaskInstall() {
    window.open(METAMASK_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')
  }

  async function disconnect() {
    markManuallyDisconnected()
    setAddress('')
    setChainId('')
    setPairingUri('')
    setConnectError('')

    if (!getInjectedEthereum() && getActiveEthereum()) {
      await disconnectMetaMaskConnect()
    }
  }

  return {
    address,
    chainId,
    connected,
    wrongNetwork,
    restoring,
    connecting,
    pairingUri,
    connectError,
    connectionMode,
    providerReady,
    needsMobileWallet,
    connect,
    openInMetaMaskApp,
    openMetaMaskInstall,
    disconnect,
  }
}
