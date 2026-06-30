import { isIosDevice, isMobileDevice } from './deviceProfile'
import { getCachedConnectProvider } from './metamaskConnect'
import { getEffectivePublicAppUrl } from './publicAppUrl'
import { isLocalDevHost } from './lanHost'

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?: boolean
  providers?: EthereumProvider[]
}

export type WalletConnectionMode = 'injected' | 'mobile-deeplink' | 'desktop-install'

export { isIosDevice, isIosSafari, isSafariBrowser } from './deviceProfile'

export function getInjectedEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null
  const eth = window.ethereum as EthereumProvider | undefined
  if (!eth) return null

  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers.find((provider) => provider.isMetaMask) ?? eth.providers[0] ?? null
  }

  return eth
}

export function hasInjectedEthereum(): boolean {
  return getInjectedEthereum() !== null
}

/** Provider activo: extensión inyectada o sesión MetaMask Connect (QR mobile). */
export function getActiveEthereum(): EthereumProvider | null {
  return getInjectedEthereum() ?? getCachedConnectProvider()
}

export function hasActiveEthereum(): boolean {
  return getActiveEthereum() !== null
}

export function getWalletConnectionMode(): WalletConnectionMode {
  if (hasInjectedEthereum()) return 'injected'
  if (isMobileDevice() || isIosDevice()) return 'mobile-deeplink'
  return 'desktop-install'
}

export function shouldOfferMetaMaskDeepLink(): boolean {
  return getWalletConnectionMode() === 'mobile-deeplink'
}

function resolveDappTargetUrl(pageUrl = window.location.href): URL | null {
  try {
    const current = new URL(pageUrl)
    const publicBase = getEffectivePublicAppUrl()

    if (publicBase && isLocalDevHost(current.hostname)) {
      const base = new URL(publicBase)
      return new URL(`${current.pathname}${current.search}${current.hash}`, base.origin)
    }

    if (isLocalDevHost(current.hostname)) return null
    return current
  } catch {
    return null
  }
}

/** Link universal de MetaMask Mobile para abrir la dApp en su navegador in-app. */
export function buildMetaMaskDappLink(pageUrl?: string): string | null {
  const target = resolveDappTargetUrl(pageUrl ?? window.location.href)
  if (!target) return null

  const hostPath = `${target.host}${target.pathname}${target.search}${target.hash}`.replace(/\/$/, '')
  return `https://metamask.app.link/dapp/${hostPath}`
}

export function openInMetaMaskBrowser(pageUrl?: string): boolean {
  const link = buildMetaMaskDappLink(pageUrl)
  if (!link) return false
  window.location.assign(link)
  return true
}

export function waitForEthereumProvider(timeoutMs = 900): Promise<EthereumProvider | null> {
  const existing = getInjectedEthereum()
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    let settled = false

    const finish = (provider: EthereumProvider | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('ethereum#initialized', onInitialized)
      window.clearTimeout(timer)
      resolve(provider)
    }

    const onInitialized = () => finish(getInjectedEthereum())
    window.addEventListener('ethereum#initialized', onInitialized as EventListener)

    const timer = window.setTimeout(() => finish(getInjectedEthereum()), timeoutMs)
  })
}

export function getWalletConnectHint(mode: WalletConnectionMode): string {
  if (mode === 'injected') return ''
  if (mode === 'mobile-deeplink') {
    return 'En Safari o Chrome mobile, abrí CarPass desde el navegador integrado de MetaMask para conectar la wallet.'
  }
  return 'Conectá con MetaMask mobile escaneando el QR, o instalá la extensión en este navegador.'
}

export const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/'
