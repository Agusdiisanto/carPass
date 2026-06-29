const LOCALE = 'es-AR'

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

export function normalizeVin(value: string): string {
  return value.toUpperCase().trim()
}
