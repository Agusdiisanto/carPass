import { JsonRpcProvider } from 'ethers'

const FALLBACK_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'

export function getPublicRpcUrl() {
  const configured = import.meta.env.VITE_SEPOLIA_RPC_URL
  if (configured && configured.trim() !== '') return configured.trim()
  return FALLBACK_SEPOLIA_RPC
}

let cachedProvider: JsonRpcProvider | null = null

export function getPublicProvider() {
  if (!cachedProvider) {
    cachedProvider = new JsonRpcProvider(getPublicRpcUrl())
  }
  return cachedProvider
}
