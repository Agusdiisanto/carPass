import type { DemoVehicle } from './demoVehicles'
import type { SealState } from './seal'

/** Mostrar filtros del catalogo cuando hay mas vehiculos que este umbral. */
export const DEMO_CATALOG_FILTER_THRESHOLD = 4

export type DemoKmBand = 'all' | 'under20' | '20to35' | 'over35'
export type DemoSealFilter = 'all' | SealState

export type DemoCatalogFilterState = {
  seal: DemoSealFilter
  km: DemoKmBand
}

export const DEMO_KM_BAND_LABELS: Record<DemoKmBand, string> = {
  all: 'Todos',
  under20: '≤ 20k',
  '20to35': '20–35k',
  over35: '+35k',
}

export const DEMO_SEAL_FILTER_LABELS: Record<DemoSealFilter, string> = {
  all: 'Todos',
  0: 'OK',
  1: 'Observaciones',
  2: 'No valido',
}

export function matchesKmBand(km: number, band: DemoKmBand): boolean {
  if (band === 'all') return true
  if (band === 'under20') return km <= 20_000
  if (band === '20to35') return km > 20_000 && km <= 35_000
  return km > 35_000
}

export function applyDemoCatalogFilters(
  vehicles: DemoVehicle[] | undefined,
  filters: DemoCatalogFilterState,
): DemoVehicle[] {
  const list = vehicles ?? []
  return list.filter((vehicle) => {
    if (filters.seal !== 'all' && vehicle.seal !== filters.seal) return false
    return matchesKmBand(vehicle.km, filters.km)
  })
}

export function hasActiveDemoCatalogFilters(filters: DemoCatalogFilterState): boolean {
  return filters.seal !== 'all' || filters.km !== 'all'
}

export function countSealOptions(
  vehicles: DemoVehicle[] | undefined,
  km: DemoKmBand,
): Record<DemoSealFilter, number> {
  const list = vehicles ?? []
  const pool = km === 'all' ? list : list.filter((vehicle) => matchesKmBand(vehicle.km, km))

  return {
    all: pool.length,
    0: pool.filter((vehicle) => vehicle.seal === 0).length,
    1: pool.filter((vehicle) => vehicle.seal === 1).length,
    2: pool.filter((vehicle) => vehicle.seal === 2).length,
  }
}

export function countKmOptions(
  vehicles: DemoVehicle[] | undefined,
  seal: DemoSealFilter,
): Record<DemoKmBand, number> {
  const list = vehicles ?? []
  const pool = seal === 'all' ? list : list.filter((vehicle) => vehicle.seal === seal)

  return {
    all: pool.length,
    under20: pool.filter((vehicle) => matchesKmBand(vehicle.km, 'under20')).length,
    '20to35': pool.filter((vehicle) => matchesKmBand(vehicle.km, '20to35')).length,
    over35: pool.filter((vehicle) => matchesKmBand(vehicle.km, 'over35')).length,
  }
}
