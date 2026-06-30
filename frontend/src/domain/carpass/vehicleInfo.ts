import type { SelloCalidad, VehiculoInfo } from '../../hooks/useCarPass'
import { coerceString, coerceYear } from './formatters'

function readField(source: Record<string, unknown>, key: string, index: number): unknown {
  const indexed = source as unknown as unknown[]
  return source[key] ?? indexed[index]
}

/** Normaliza structs devueltos por ethers (bigint, tuplas, campos faltantes). */
export function normalizeVehiculoInfo(raw: unknown): VehiculoInfo {
  if (Array.isArray(raw)) {
    return {
      vin: coerceString(raw[0]),
      marca: coerceString(raw[1]),
      modelo: coerceString(raw[2]),
      anio: coerceYear(raw[3]),
      color: coerceString(raw[4]),
    }
  }

  const source = (raw ?? {}) as Record<string, unknown>
  return {
    vin: coerceString(readField(source, 'vin', 0)),
    marca: coerceString(readField(source, 'marca', 1)),
    modelo: coerceString(readField(source, 'modelo', 2)),
    anio: coerceYear(readField(source, 'anio', 3)),
    color: coerceString(readField(source, 'color', 4)),
  }
}

export function normalizeSelloCalidad(raw: unknown): SelloCalidad {
  if (Array.isArray(raw)) {
    return {
      estado: Number(raw[0] ?? 1),
      motivo: coerceString(raw[1], 'Sin motivo registrado'),
    }
  }

  const source = (raw ?? {}) as Record<string, unknown>
  return {
    estado: Number(source.estado ?? 1),
    motivo: coerceString(source.motivo, 'Sin motivo registrado'),
  }
}
