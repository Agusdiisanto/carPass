import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'
import { buildMetaMaskDappLink } from './ethereumProvider'
import { appendWalletHintToUrl } from './companionUrl'
import { getPublicAppOrigin } from './publicAppUrl'

export const PANEL_PARAM = 'panel'
export const PANEL_OPERATIVE = 'operative'

export type AppSessionState = {
  vin: string | null
  wantsPanel: boolean
}

export function getAppSessionFromUrl(search = typeof window !== 'undefined' ? window.location.search : ''): AppSessionState {
  const params = new URLSearchParams(search)
  const rawVin = params.get('vin') ?? params.get('VIN')
  let vin: string | null = null
  if (rawVin) {
    const normalized = normalizeVin(rawVin)
    if (isValidVin(normalized)) vin = normalized
  }
  return {
    vin,
    wantsPanel: params.get(PANEL_PARAM) === PANEL_OPERATIVE,
  }
}

export function buildAppContinuationUrl(options: {
  vin?: string | null
  wantsPanel?: boolean
  basePath?: string
}): string {
  const origin = getPublicAppOrigin()
  const path = options.basePath ?? ((typeof window !== 'undefined' ? window.location.pathname : '/') || '/')
  const url = new URL(path, origin)

  if (options.vin) {
    const normalized = normalizeVin(options.vin)
    if (isValidVin(normalized)) url.searchParams.set('vin', normalized)
  }

  if (options.wantsPanel) {
    url.searchParams.set(PANEL_PARAM, PANEL_OPERATIVE)
  } else {
    url.searchParams.delete(PANEL_PARAM)
  }

  url.searchParams.delete('companion')
  url.searchParams.delete('VIN')
  return url.toString()
}

/** URL para abrir en MetaMask mobile con VIN + panel operativo. */
export function buildOperativeSessionUrl(vin: string): string {
  return appendWalletHintToUrl(buildAppContinuationUrl({ vin, wantsPanel: true }))
}

export function buildMetaMaskOperativeLink(vin: string): string | null {
  return buildMetaMaskDappLink(buildOperativeSessionUrl(vin))
}

export function syncAppSessionUrl(state: Partial<AppSessionState>, replace = true): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  if (state.vin !== undefined) {
    if (state.vin) {
      const normalized = normalizeVin(state.vin)
      if (isValidVin(normalized)) url.searchParams.set('vin', normalized)
    } else {
      url.searchParams.delete('vin')
      url.searchParams.delete('VIN')
    }
  }

  if (state.wantsPanel !== undefined) {
    if (state.wantsPanel) url.searchParams.set(PANEL_PARAM, PANEL_OPERATIVE)
    else url.searchParams.delete(PANEL_PARAM)
  }

  if (replace) window.history.replaceState({}, '', url.toString())
  else window.history.pushState({}, '', url.toString())
}

export function clearOperativeSessionFromUrl(): void {
  syncAppSessionUrl({ wantsPanel: false })
}
