import type { DemoVehicle } from '../domain/carpass/demoVehicles'
import type { DemoCatalogFilterState, DemoKmBand, DemoSealFilter } from '../domain/carpass/demoCatalogFilters'
import {
  countKmOptions,
  countSealOptions,
  DEMO_KM_BAND_LABELS,
  DEMO_SEAL_FILTER_LABELS,
  hasActiveDemoCatalogFilters,
} from '../domain/carpass/demoCatalogFilters'

type DemoCatalogFiltersProps = {
  vehicles?: DemoVehicle[]
  filters: DemoCatalogFilterState
  resultCount: number
  onChange: (filters: DemoCatalogFilterState) => void
}

const SEAL_OPTIONS: DemoSealFilter[] = ['all', 0, 1, 2]
const KM_OPTIONS: DemoKmBand[] = ['all', 'under20', '20to35', 'over35']

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function sealDotClass(option: DemoSealFilter): string {
  if (option === 0) return 'pv-catalog-filters__dot--ok'
  if (option === 1) return 'pv-catalog-filters__dot--warn'
  if (option === 2) return 'pv-catalog-filters__dot--bad'
  return ''
}

export function DemoCatalogFilters({
  vehicles = [],
  filters,
  resultCount,
  onChange,
}: DemoCatalogFiltersProps) {
  const active = hasActiveDemoCatalogFilters(filters)
  const sealCounts = countSealOptions(vehicles, filters.km)
  const kmCounts = countKmOptions(vehicles, filters.seal)

  return (
    <div className={`pv-catalog-filters ${active ? 'pv-catalog-filters--active' : ''}`}>
      <div className="pv-catalog-filters__top">
        <div className="pv-catalog-filters__title">
          <span className="pv-catalog-filters__title-icon" aria-hidden>
            <FilterIcon />
          </span>
          <span>Refinar flota</span>
          {active ? (
            <span className="pv-catalog-filters__result-pill">
              {resultCount} resultado{resultCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {active ? (
          <button
            type="button"
            className="pv-catalog-filters__clear"
            onClick={() => onChange({ seal: 'all', km: 'all' })}
            title="Limpiar filtros"
            aria-label="Limpiar filtros"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div className="pv-catalog-filters__rows">
        <div className="pv-catalog-filters__row">
          <span className="pv-catalog-filters__label">Sello</span>
          <div className="pv-catalog-filters__segmented" role="group" aria-label="Filtrar por sello">
            {SEAL_OPTIONS.map((option) => {
              const count = sealCounts[option]
              const disabled = count === 0 && option !== 'all'
              const isActive = filters.seal === option

              return (
                <button
                  key={option}
                  type="button"
                  className={[
                    'pv-catalog-filters__option',
                    isActive ? 'active' : '',
                    option !== 'all' ? `pv-catalog-filters__option--seal-${option}` : '',
                    disabled ? 'disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={isActive}
                  disabled={disabled}
                  onClick={() => onChange({ ...filters, seal: option })}
                >
                  {option !== 'all' ? (
                    <span className={`pv-catalog-filters__dot ${sealDotClass(option)}`} aria-hidden />
                  ) : null}
                  <span className="pv-catalog-filters__option-label">{DEMO_SEAL_FILTER_LABELS[option]}</span>
                  <span className="pv-catalog-filters__count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pv-catalog-filters__row">
          <span className="pv-catalog-filters__label">Km</span>
          <div className="pv-catalog-filters__segmented" role="group" aria-label="Filtrar por kilometraje">
            {KM_OPTIONS.map((option) => {
              const count = kmCounts[option]
              const disabled = count === 0 && option !== 'all'
              const isActive = filters.km === option

              return (
                <button
                  key={option}
                  type="button"
                  className={[
                    'pv-catalog-filters__option',
                    isActive ? 'active' : '',
                    disabled ? 'disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={isActive}
                  disabled={disabled}
                  onClick={() => onChange({ ...filters, km: option })}
                >
                  <span className="pv-catalog-filters__option-label">{DEMO_KM_BAND_LABELS[option]}</span>
                  <span className="pv-catalog-filters__count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
