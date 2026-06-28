import { useState } from 'react'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export type WalletState = {
  address: string
  chainId: string
  connected: boolean
}

export const expectedChainId = import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? '11155111'

function parseChainId(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return Number.parseInt(raw, 16).toString()
}

export function shortAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

export function useWallet() {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState('')

  const connected = Boolean(address && chainId === expectedChainId)
  const wrongNetwork = Boolean(address && chainId && chainId !== expectedChainId)

  async function connect() {
    if (!window.ethereum) throw new Error('MetaMask no detectado')
    const eth = window.ethereum as EthereumProvider
    const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
    const chain = parseChainId(await eth.request({ method: 'eth_chainId' }))
    setAddress(accounts[0] ?? '')
    setChainId(chain)
  }

  function disconnect() {
    setAddress('')
    setChainId('')
  }

  return { address, chainId, connected, wrongNetwork, connect, disconnect }
}
