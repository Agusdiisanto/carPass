import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'

const PENDING_VIN_KEY = 'carpass_pending_operative_vin'

export function setPendingOperativeVin(vin: string) {
  const normalized = normalizeVin(vin)
  if (!isValidVin(normalized)) return
  try {
    sessionStorage.setItem(PENDING_VIN_KEY, normalized)
  } catch {
    // sessionStorage no disponible.
  }
}

export function takePendingOperativeVin(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_VIN_KEY)
    sessionStorage.removeItem(PENDING_VIN_KEY)
    if (!raw) return null
    const normalized = normalizeVin(raw)
    return isValidVin(normalized) ? normalized : null
  } catch {
    return null
  }
}
