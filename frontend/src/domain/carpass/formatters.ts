const LOCALE = 'es-AR'

export function coerceString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return fallback
}

export function safeUpperCase(value: unknown, fallback = ''): string {
  return coerceString(value, fallback).toUpperCase()
}

export function coerceYear(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'bigint') return Number(value)
  const parsed = Number(coerceString(value))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

export function formatKm(value: bigint | number): string {
  return `${formatNumber(value)} km`
}

export function formatNumber(value: bigint | number): string {
  const n = typeof value === 'bigint' ? Number(value) : value
  return n.toLocaleString(LOCALE)
}

export function formatDate(ts: bigint | number): string {
  const n = typeof ts === 'bigint' ? Number(ts) : ts
  if (!n) return '-'
  return new Date(n * 1000).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonthYear(ts: bigint | number): string | null {
  const n = typeof ts === 'bigint' ? Number(ts) : ts
  if (!n) return null
  const d = new Date(n * 1000)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function normalizeVin(value: unknown): string {
  return safeUpperCase(value).trim()
}
