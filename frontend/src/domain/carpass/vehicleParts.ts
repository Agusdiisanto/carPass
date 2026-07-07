import { coerceString } from './formatters'
import type { SelloCalidad } from '../../hooks/useCarPass'

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

const AUTOPARTE_AFECTADA_RE = /^Autoparte afectada:\s*([^.]+)\./i

/** Lee la autoparte afectada que la aseguradora antepuso a la descripcion del siniestro. */
export function parseAutoparteAfectada(descripcion: string): number | null {
  const match = AUTOPARTE_AFECTADA_RE.exec(descripcion.trim())
  if (!match) return null
  const label = match[1].trim().toLowerCase()
  const tipo = TIPOS_PARTE.find((t) => t.label.toLowerCase() === label)
  return tipo ? tipo.value : null
}

/**
 * Un siniestro grave nunca vuelve a marcarse `reparado` on-chain (historial append-only).
 * Si la autoparte que declaro afectada la aseguradora fue reemplazada despues
 * de esa fecha, se considera reparado a nivel UI aunque el campo on-chain siga en false.
 */
export function siniestroFueReparado(
  siniestro: { descripcion: string; reparado: boolean; timestamp: bigint },
  partes: Parte[],
): boolean {
  if (siniestro.reparado) return true
  const tipo = parseAutoparteAfectada(siniestro.descripcion)
  if (tipo === null) return false
  const parte = partes.find((p) => p.tipo === tipo)
  return Boolean(parte && parte.reemplazada && parte.timestamp > siniestro.timestamp)
}

const MOTIVO_SINIESTRO_SIN_REPARAR = 'Siniestro grave sin reparacion registrada'
const SINIESTRO_GRAVEDAD_GRAVE = 2

/**
 * El campo on-chain `reparado` de un siniestro GRAVE nunca puede volver a ponerse en
 * `true` (historial append-only), asi que `getSelloCalidad` revoca el sello para
 * siempre en cuanto se declara uno. Si el taller ya reemplazo la autoparte declarada
 * afectada, se ajusta el sello mostrado para reflejar esa reparacion verificable en
 * `VehicleParts`, en vez de seguir mostrando "NO VALIDO" de forma contradictoria con
 * el timeline publico.
 */
export function resolveDisplaySello(
  sello: SelloCalidad,
  siniestros: Array<{ descripcion: string; reparado: boolean; timestamp: bigint; gravedad: number | bigint }>,
  partes: Parte[],
): SelloCalidad {
  if (sello.motivo !== MOTIVO_SINIESTRO_SIN_REPARAR) return sello

  const graves = siniestros.filter((s) => Number(s.gravedad) === SINIESTRO_GRAVEDAD_GRAVE)
  const todosReparados = graves.length > 0 && graves.every((s) => siniestroFueReparado(s, partes))
  if (!todosReparados) return sello

  return {
    estado: 1,
    motivo: 'Siniestro grave reparado en taller (reemplazo de autoparte verificado). Sello on-chain pendiente de actualizacion.',
  }
}
