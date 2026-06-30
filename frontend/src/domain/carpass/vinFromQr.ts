import { coerceString, normalizeVin } from './formatters'
import { isValidVin } from './validators'

export function extractVinFromQrPayload(raw: unknown): string | null {
  const trimmed = coerceString(raw).trim()
  if (!trimmed) return null

  const direct = normalizeVin(trimmed)
  if (isValidVin(direct)) return direct

  const vinMatch = trimmed.toUpperCase().match(/[A-HJ-NPR-Z0-9]{17}/)
  if (vinMatch && isValidVin(vinMatch[0])) return vinMatch[0]

  try {
    const asUrl = trimmed.startsWith('http') ? trimmed : `https://carpass.local/?${trimmed}`
    const url = new URL(asUrl)
    const queryVin = url.searchParams.get('vin') ?? url.searchParams.get('VIN')
    if (queryVin) {
      const normalized = normalizeVin(queryVin)
      if (isValidVin(normalized)) return normalized
    }
    const pathVin = url.pathname.split('/').pop()
    if (pathVin) {
      const normalized = normalizeVin(pathVin)
      if (isValidVin(normalized)) return normalized
    }
  } catch {
    // No es URL valida; seguir con otros formatos.
  }

  const labeled = trimmed.match(/(?:VIN|vin)[:=]\s*([A-HJ-NPR-Z0-9]{17})/)
  if (labeled) {
    const normalized = normalizeVin(labeled[1])
    if (isValidVin(normalized)) return normalized
  }

  return null
}
