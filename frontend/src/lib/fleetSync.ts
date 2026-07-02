const FLEET_SYNC_EVENT = 'carpass:fleet-sync-request'

export function requestFleetSync() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(FLEET_SYNC_EVENT))
}

export function subscribeFleetSyncRequests(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = () => handler()
  window.addEventListener(FLEET_SYNC_EVENT, listener)
  return () => window.removeEventListener(FLEET_SYNC_EVENT, listener)
}
