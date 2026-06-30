import { useEffect, useState } from 'react'
import { formatKm } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'
import type { VehicleLookupResult } from '../hooks/useVehicleLookup'
import { clearVinFromUrl, getVinFromLocation } from '../lib/companionUrl'
import { takePendingOperativeVin } from '../lib/operativeVinBridge'
import { isMobileDevice } from '../lib/deviceProfile'
import { VinQrScanner } from './VinQrScanner'

type OperativeAccent = 'taller' | 'aseguradora' | 'inspector'

type LookupState = {
  vin: string
  setVin: (value: string) => void
  vehicle: { vin: string; marca: string; modelo: string; anio: number; color: string } | null
  lastKm: number
  found: boolean
  error: string
  loading: boolean
  search: (vinToSearch?: string) => Promise<VehicleLookupResult | null>
  reset: () => void
}

type VehicleIdentifyPanelProps = {
  lookup: LookupState
  accent: OperativeAccent
  onIdentified?: (result: VehicleLookupResult) => void
  showMileage?: boolean
  autoOpenScanner?: boolean
}

function QrIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function CarBadgeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 17h14M5 17a2 2 0 1 0-4 0 2 2 0 0 0 4 0Zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M3 12h18l-2-7H5l-2 7Z" />
    </svg>
  )
}

const ACCENT_COPY: Record<OperativeAccent, { scanTitle: string; scanHint: string }> = {
  taller: {
    scanTitle: 'Escaneá el pasaporte para cargar el service',
    scanHint: 'Ideal en el box: apuntá al QR del vehículo y completá el kilometraje.',
  },
  aseguradora: {
    scanTitle: 'Escaneá el pasaporte para declarar el siniestro',
    scanHint: 'Identificá el vehículo al instante desde el QR del parabrisas o del pasaporte.',
  },
  inspector: {
    scanTitle: 'Escaneá el pasaporte para registrar la VTV',
    scanHint: 'En la línea de inspección, el QR evita tipear los 17 caracteres.',
  },
}

export function VehicleIdentifyPanel({
  lookup,
  accent,
  onIdentified,
  showMileage = false,
  autoOpenScanner = isMobileDevice(),
}: VehicleIdentifyPanelProps) {
  const [qrOpen, setQrOpen] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)
  const copy = ACCENT_COPY[accent]

  async function runSearch(vinToSearch: string) {
    const result = await lookup.search(vinToSearch)
    if (result) onIdentified?.(result)
    return result
  }

  useEffect(() => {
    if (bootstrapped) return

    const urlVin = getVinFromLocation()
    const pendingVin = takePendingOperativeVin()
    const initialVin = urlVin ?? pendingVin

    if (urlVin) clearVinFromUrl()

    if (initialVin) {
      void runSearch(initialVin)
      setBootstrapped(true)
      return
    }

    if (autoOpenScanner && !lookup.found) {
      setQrOpen(true)
    }

    setBootstrapped(true)
  }, [bootstrapped])

  async function handleQrDetected(vin: string) {
    await runSearch(vin)
  }

  function handleManualSearch() {
    void runSearch(lookup.vin)
  }

  if (lookup.found && lookup.vehicle) {
    return (
      <section className={`op-identify op-identify--${accent} op-identify--found`}>
        <div className={`op-vehicle-card op-vehicle-card--${accent}`}>
          <div className="op-vehicle-card__icon" aria-hidden>
            <CarBadgeIcon />
          </div>
          <div className="op-vehicle-card__body">
            <p className="op-vehicle-card__eyebrow">Vehículo identificado</p>
            <h4 className="op-vehicle-card__title">
              {lookup.vehicle.marca} {lookup.vehicle.modelo}
            </h4>
            <p className="op-vehicle-card__meta">
              {lookup.vehicle.anio} · {lookup.vehicle.color}
            </p>
            <code className="op-vehicle-card__vin">{lookup.vehicle.vin}</code>
            {showMileage ? (
              <p className="op-vehicle-card__km">
                Último km registrado: <strong>{formatKm(lookup.lastKm)}</strong>
              </p>
            ) : null}
          </div>
          <div className="op-vehicle-card__actions">
            <button type="button" className="op-vehicle-card__rescan" onClick={() => setQrOpen(true)}>
              <QrIcon />
              Reescanear
            </button>
            <button type="button" className="op-vehicle-card__change" onClick={lookup.reset}>
              Cambiar
            </button>
          </div>
        </div>

        <VinQrScanner
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          onDetected={handleQrDetected}
          variant="operativo"
        />
      </section>
    )
  }

  return (
    <section className={`op-identify op-identify--${accent}`} aria-label="Identificar vehículo">
      <div className="op-identify__scan-zone">
        <p className="op-identify__eyebrow">Identificación rápida</p>
        <h3 className="op-identify__title">{copy.scanTitle}</h3>
        <p className="op-identify__hint">{copy.scanHint}</p>
        <button type="button" className="op-identify__scan-btn" onClick={() => setQrOpen(true)}>
          <QrIcon />
          Escanear QR del vehículo
        </button>
      </div>

      <div className="op-identify__divider" aria-hidden>
        <span>o ingresá el VIN</span>
      </div>

      <div className="op-identify__manual">
        <div className="vin-search-bar vin-search-bar--with-qr op-identify__search">
          <span className="vin-search-bar__icon" aria-hidden>
            <SearchIcon />
          </span>
          <input
            className="vin-search-bar__input"
            maxLength={17}
            placeholder="17 caracteres del VIN"
            value={lookup.vin}
            onChange={(e) => lookup.setVin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            autoComplete="off"
            spellCheck={false}
            aria-label="Número VIN"
          />
          <button
            type="button"
            className="vin-search-bar__qr"
            onClick={() => setQrOpen(true)}
            title="Escanear QR"
            aria-label="Escanear QR"
          >
            <QrIcon />
          </button>
          <button
            type="button"
            className="vin-search-bar__btn"
            disabled={!isValidVin(lookup.vin) || lookup.loading}
            onClick={handleManualSearch}
          >
            {lookup.loading ? '...' : 'Buscar'}
          </button>
        </div>

        <div className="op-identify__meta">
          <span className={`op-identify__counter ${isValidVin(lookup.vin) ? 'ready' : ''}`}>
            {lookup.vin.length}/17
          </span>
          <span className="op-identify__meta-hint">También acepta enlaces con ?vin= desde el QR</span>
        </div>
      </div>

      {lookup.error ? <p className="error-msg op-identify__error">{lookup.error}</p> : null}

      <VinQrScanner
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onDetected={handleQrDetected}
        variant="operativo"
      />
    </section>
  )
}
