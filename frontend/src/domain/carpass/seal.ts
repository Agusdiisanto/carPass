export type SealState = 0 | 1 | 2

export type SealUi = {
  label: string
  shortLabel: string
  cls: string
  icon: string
}

export const SEAL_STATES: Record<SealState, SealUi> = {
  0: { label: 'Valido', shortLabel: 'Valido', cls: 'seal-ok', icon: 'OK' },
  1: { label: 'Observaciones', shortLabel: 'Observaciones', cls: 'seal-warn', icon: '!' },
  2: { label: 'No valido', shortLabel: 'No valido', cls: 'seal-bad', icon: 'X' },
}

/** Etiqueta corta para chips en cards del catálogo. */
export function getSealChipLabel(state: number): string {
  const seal = getSealUi(state)
  if (seal.cls === 'seal-ok') return 'OK'
  if (seal.cls === 'seal-bad') return 'No OK'
  return 'Obs.'
}

export function getSealUi(state: unknown): SealUi {
  const normalized = Number(state)
  const key = (Number.isFinite(normalized) ? normalized : 1) as SealState
  return SEAL_STATES[key] ?? SEAL_STATES[1]
}
