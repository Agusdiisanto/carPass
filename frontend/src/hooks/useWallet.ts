import { useEffect, useState } from 'react'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

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
    // sessionStorage/localStorage no disponible.
  }
}

function clearManualDisconnect() {
  try {
    localStorage.removeItem(WALLET_DISCONNECTED_KEY)
  } catch {
    // sessionStorage/localStorage no disponible.
  }
}

export function useWallet() {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState('')
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    if (!window.ethereum) {
      setRestoring(false)
      return
    }
    const eth = window.ethereum as EthereumProvider
    let cancelled = false

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? accounts : []
      setAddress(typeof nextAccounts[0] === 'string' ? nextAccounts[0] : '')
    }

    const handleChainChanged = (rawChainId: unknown) => {
      setChainId(parseChainId(rawChainId))
    }

    async function restoreSession() {
      try {
        if (wasManuallyDisconnected()) return
        const accounts = (await eth.request({ method: 'eth_accounts' })) as string[]
        const chain = parseChainId(await eth.request({ method: 'eth_chainId' }))
        if (cancelled) return
        setAddress(accounts[0] ?? '')
        setChainId(chain)
      } catch {
        // MetaMask no autorizado o provider no disponible.
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }

    eth.on?.('accountsChanged', handleAccountsChanged)
    eth.on?.('chainChanged', handleChainChanged)

    void restoreSession()

    return () => {
      cancelled = true
      eth.removeListener?.('accountsChanged', handleAccountsChanged)
      eth.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [])

  const connected = Boolean(address && chainId === expectedChainId)
  const wrongNetwork = Boolean(address && chainId && chainId !== expectedChainId)

  async function connect() {
    if (!window.ethereum) throw new Error('MetaMask no detectado')
    clearManualDisconnect()
    const eth = window.ethereum as EthereumProvider
    const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
    const chain = parseChainId(await eth.request({ method: 'eth_chainId' }))
    setAddress(accounts[0] ?? '')
    setChainId(chain)
  }

  function disconnect() {
    markManuallyDisconnected()
    setAddress('')
    setChainId('')
  }

  return { address, chainId, connected, wrongNetwork, restoring, connect, disconnect }
}
