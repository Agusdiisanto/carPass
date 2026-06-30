import { coerceString } from './formatters'

export const TOTAL_TIPOS_PARTE = 6

export const TIPOS_PARTE: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Motor' },
  { value: 1, label: 'Caja de cambios' },
  { value: 2, label: 'Puerta delantera izquierda' },
  { value: 3, label: 'Puerta delantera derecha' },
  { value: 4, label: 'Capot' },
  { value: 5, label: 'Baúl' },
]

export function tipoParteLabel(tipo: number): string {
  return TIPOS_PARTE[tipo]?.label ?? `Parte ${tipo}`
}

export type Parte = {
  vehicleTokenId: bigint
  tipo: number
  numeroGrabado: string
  timestamp: bigint
  instalador: string
  reemplazada: boolean
}

function readField(source: Record<string, unknown>, key: string, index: number): unknown {
  const indexed = source as unknown as unknown[]
  return source[key] ?? indexed[index]
}

/** Normaliza el struct Parte devuelto por ethers (bigint, tuplas, campos faltantes). */
export function normalizeParte(raw: unknown): Parte {
  const source = (raw ?? {}) as Record<string, unknown>
  return {
    vehicleTokenId: BigInt((readField(source, 'vehicleTokenId', 0) as bigint | number | string) ?? 0),
    tipo: Number(readField(source, 'tipo', 1) ?? 0),
    numeroGrabado: coerceString(readField(source, 'numeroGrabado', 2)),
    timestamp: BigInt((readField(source, 'timestamp', 3) as bigint | number | string) ?? 0),
    instalador: coerceString(readField(source, 'instalador', 4)),
    reemplazada: Boolean(readField(source, 'reemplazada', 5)),
  }
}

export function normalizePartes(raw: unknown[]): Parte[] {
  return raw.map(normalizeParte)
}

export function isPartesInstaladas(partes: Parte[]): boolean {
  return partes.some((parte) => parte.numeroGrabado.trim().length > 0)
}
