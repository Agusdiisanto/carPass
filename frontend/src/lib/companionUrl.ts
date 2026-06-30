import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'

import { isLocalDevHost, isPrivateIpv4, replaceHostnameInUrl } from './lanHost'
import {
  getEffectivePublicAppUrl,
  getPublicAppOrigin,
} from './publicAppUrl'

export { getConfiguredPublicAppUrl, getEffectivePublicAppUrl } from './publicAppUrl'

export const COMPANION_PARAM = 'companion'
export const COMPANION_SCAN_VALUE = 'scan'

type CompanionUrlOptions = {
  lanHost?: string | null
}

export function buildCompanionScanUrl(options: CompanionUrlOptions = {}): string {
  const deployBase = getEffectivePublicAppUrl()

  if (deployBase) {
    const url = new URL(deployBase)
    url.searchParams.set(COMPANION_PARAM, COMPANION_SCAN_VALUE)
    url.searchParams.delete('vin')
    url.searchParams.delete('VIN')
    return url.toString()
  }

  const url = new URL(window.location.href)
  url.searchParams.set(COMPANION_PARAM, COMPANION_SCAN_VALUE)
  url.searchParams.delete('vin')
  url.searchParams.delete('VIN')

  if (isLocalDevHost()) {
    if (options.lanHost && isPrivateIpv4(options.lanHost)) {
      return replaceHostnameInUrl(url.toString(), options.lanHost)
    }
    return ''
  }

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
