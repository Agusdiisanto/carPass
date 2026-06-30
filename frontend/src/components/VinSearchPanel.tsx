import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'

type VinSearchPanelProps = {
  vin: string
  loading: boolean
  error: string
  scanEnabled?: boolean
  onVinChange: (vin: string) => void
  onSearch: () => void
  onScan?: () => void
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h2v2h-2z" />
      <path d="M20 14h1v1h-1z" />
      <path d="M14 20h2v1h-2z" />
      <path d="M20 17h1v4h-1z" />
      <path d="M17 20h4v1h-4z" />
    </svg>
  )
}

export function VinSearchPanel({
  vin,
  loading,
  error,
  scanEnabled = false,
  onVinChange,
  onSearch,
  onScan,
}: VinSearchPanelProps) {
  return (
    <section className="pv-search-panel" aria-label="Busqueda por VIN o QR">
      <div className={`vin-search-bar${scanEnabled ? ' vin-search-bar--with-qr' : ''}`}>
        <span className="vin-search-bar__icon" aria-hidden>
          <SearchIcon />
        </span>
        <input
          className="vin-search-bar__input"
          maxLength={17}
          placeholder={scanEnabled ? 'VIN o escaneá QR' : 'Ingresá el VIN (17 caracteres)'}
          value={vin}
          onChange={(e) => onVinChange(normalizeVin(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          autoComplete="off"
          autoFocus
          spellCheck={false}
          aria-label="Numero VIN"
        />
        {scanEnabled && onScan ? (
          <button
            type="button"
            className="vin-search-bar__qr"
            onClick={onScan}
            title="Escanear QR del pasaporte"
            aria-label="Escanear QR del pasaporte"
          >
            <QrIcon />
          </button>
        ) : null}
        <button
          type="button"
          className="vin-search-bar__btn"
          disabled={!isValidVin(vin) || loading}
          onClick={onSearch}
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {vin.length > 0 ? (
        <span className={`pv-vin-counter ${isValidVin(vin) ? 'ready' : ''}`} aria-live="polite">
          {vin.length}/17
        </span>
      ) : null}

      {error ? <p className="pv-error">{error}</p> : null}
    </section>
  )
}
