import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'
import { getAddress, isAddress } from 'ethers'

import { isLocalDevHost, isPrivateIpv4, replaceHostnameInUrl } from './lanHost'
import { PANEL_OPERATIVE, PANEL_PARAM } from './appSessionUrl'
import {
  getEffectivePublicAppUrl,
  getPublicAppOrigin,
} from './publicAppUrl'

export { getConfiguredPublicAppUrl, getEffectivePublicAppUrl } from './publicAppUrl'

export const COMPANION_PARAM = 'companion'
export const COMPANION_SCAN_VALUE = 'scan'
export const WALLET_HINT_PARAM = 'w'

const WALLET_HINT_SESSION_KEY = 'carpass_wallet_hint'

type CompanionUrlOptions = {
  lanHost?: string | null
  operative?: boolean
  /** Address conectada en la PC — hint para el celular (no es auth). */
  walletAddress?: string | null
}

function applyWalletHint(url: URL, walletAddress?: string | null): void {
  if (walletAddress && isAddress(walletAddress)) {
    url.searchParams.set(WALLET_HINT_PARAM, getAddress(walletAddress))
  } else {
    url.searchParams.delete(WALLET_HINT_PARAM)
  }
}

function applyCompanionParams(url: URL, options: CompanionUrlOptions): void {
  url.searchParams.set(COMPANION_PARAM, COMPANION_SCAN_VALUE)
  url.searchParams.delete('vin')
  url.searchParams.delete('VIN')
  if (options.operative) url.searchParams.set(PANEL_PARAM, PANEL_OPERATIVE)
  else url.searchParams.delete(PANEL_PARAM)
  applyWalletHint(url, options.walletAddress)
}

export function buildCompanionScanUrl(options: CompanionUrlOptions = {}): string {
  const deployBase = getEffectivePublicAppUrl()

  if (deployBase) {
    const url = new URL(deployBase)
    applyCompanionParams(url, options)
    return url.toString()
  }

  const url = new URL(window.location.href)
  applyCompanionParams(url, options)

  if (isLocalDevHost()) {
    if (options.lanHost && isPrivateIpv4(options.lanHost)) {
      return replaceHostnameInUrl(url.toString(), options.lanHost)
    }
    return ''
  }

  return url.toString()
}

export function getWalletHintFromUrl(search = typeof window !== 'undefined' ? window.location.search : ''): string | null {
  const raw = new URLSearchParams(search).get(WALLET_HINT_PARAM)
  if (!raw || !isAddress(raw)) return null
  return getAddress(raw)
}

export function rememberWalletHint(address: string | null): void {
  try {
    if (address && isAddress(address)) {
      sessionStorage.setItem(WALLET_HINT_SESSION_KEY, getAddress(address))
    }
  } catch {
    // sessionStorage no disponible.
  }
}

export function getRememberedWalletHint(): string | null {
  try {
    const fromUrl = getWalletHintFromUrl()
    if (fromUrl) {
      sessionStorage.setItem(WALLET_HINT_SESSION_KEY, fromUrl)
      return fromUrl
    }
    const stored = sessionStorage.getItem(WALLET_HINT_SESSION_KEY)
    if (stored && isAddress(stored)) return getAddress(stored)
  } catch {
    // sessionStorage no disponible.
  }
  return null
}

export function appendWalletHintToUrl(urlString: string, walletAddress?: string | null): string {
  const hint = walletAddress ?? getRememberedWalletHint()
  if (!hint) return urlString
  const url = new URL(urlString)
  url.searchParams.set(WALLET_HINT_PARAM, hint)
  return url.toString()
}

export function buildVinRelayPayload(vin: string): string {
  const origin = getPublicAppOrigin()
  const path = window.location.pathname || '/'
  const url = new URL(path, origin)
  url.searchParams.set('vin', vin)
  url.searchParams.delete(COMPANION_PARAM)
  return url.toString()
}

export function isCompanionScanMode(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.get(COMPANION_PARAM) === COMPANION_SCAN_VALUE
}

export function getVinFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('vin') ?? params.get('VIN')
  if (!raw) return null
  const normalized = normalizeVin(raw)
  return isValidVin(normalized) ? normalized : null
}

export function clearCompanionFromUrl(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(COMPANION_PARAM)) return
  url.searchParams.delete(COMPANION_PARAM)
  window.history.replaceState({}, '', url.toString())
}

export function clearVinFromUrl(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('vin') && !url.searchParams.has('VIN')) return
  url.searchParams.delete('vin')
  url.searchParams.delete('VIN')
  window.history.replaceState({}, '', url.toString())
}
