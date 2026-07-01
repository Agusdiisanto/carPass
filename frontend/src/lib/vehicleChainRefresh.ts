import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'

export type VehicleChainRefreshReason =
  | 'mint'
  | 'transfer'
  | 'service'
  | 'vtv'
  | 'siniestro'
  | 'autopartes'
  | 'generic'

export type VehicleChainRefreshDetail = {
  vin: string
  reason: VehicleChainRefreshReason
}

const EVENT_NAME = 'carpass:vehicle-chain-updated'

export function notifyVehicleChainUpdate(
  vin: string,
  reason: VehicleChainRefreshReason = 'generic',
) {
  if (typeof window === 'undefined') return

  const normalized = normalizeVin(vin)
  if (!isValidVin(normalized)) return

  window.dispatchEvent(
    new CustomEvent<VehicleChainRefreshDetail>(EVENT_NAME, {
      detail: { vin: normalized, reason },
    }),
  )
}

export function subscribeVehicleChainUpdates(
  handler: (detail: VehicleChainRefreshDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<VehicleChainRefreshDetail>).detail
    if (!detail?.vin || !isValidVin(detail.vin)) return
    handler(detail)
  }

  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
