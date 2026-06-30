import { useEffect, useMemo, useState } from 'react'
import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'
import { MisAutoCard } from '../components/MisAutoCard'
import { TransferDominioSheet } from '../components/TransferDominioSheet'
import type { MiVehiculo } from '../hooks/useMisVehiculos'
import { useMisVehiculos } from '../hooks/useMisVehiculos'
import { getVehiculoPorVin } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'

type MisAutosViewProps = {
  address: string
  wrongNetwork?: boolean
  compact?: boolean
  transferVin?: string | null
  onTransferDismiss?: () => void
  onViewPassport: (vin: string) => void
  onTransfer: (vin: string) => void
}

function FleetSkeleton() {
  return (
    <div className="mis-autos-grid mis-autos-grid--loading" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="mis-auto-card mis-auto-card--skeleton" />
      ))}
    </div>
  )
}

export function MisAutosView({
  address,
  wrongNetwork = false,
  compact = false,
  transferVin = null,
  onTransferDismiss,
  onViewPassport,
  onTransfer,
}: MisAutosViewProps) {
  const { vehiculos, cargando, sincronizando, error, reload } = useMisVehiculos(address)
  const [transferTarget, setTransferTarget] = useState<MiVehiculo | null>(null)
  const [pendingVin, setPendingVin] = useState<string | null>(transferVin)
  const [vinLookup, setVinLookup] = useState('')
  const [vinLookupError, setVinLookupError] = useState('')
  const [vinLookupBusy, setVinLookupBusy] = useState(false)

  const normalizedPendingVin = useMemo(
    () => (pendingVin ? normalizeVin(pendingVin) : null),
    [pendingVin],
  )

  useEffect(() => {
    setPendingVin(transferVin)
  }, [transferVin])

  useEffect(() => {
    if (!normalizedPendingVin || cargando) return

    const fromFleet = vehiculos.find(
      (vehicle) => normalizeVin(vehicle.info.vin) === normalizedPendingVin,
    )
    if (fromFleet) {
      setTransferTarget(fromFleet)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const vehiculo = await getVehiculoPorVin(normalizedPendingVin)
        if (!cancelled) setTransferTarget(vehiculo)
      } catch {
        if (!cancelled) setPendingVin(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [normalizedPendingVin, cargando, vehiculos])

  function openTransfer(vehicle: MiVehiculo) {
    setTransferTarget(vehicle)
    onTransfer(vehicle.info.vin)
  }

  function closeTransfer() {
    setTransferTarget(null)
    setPendingVin(null)
    onTransferDismiss?.()
  }

  async function buscarVinParaTransferir() {
    const vin = normalizeVin(vinLookup)
    setVinLookup(vin)
    if (!isValidVin(vin)) {
      setVinLookupError('Ingresá un VIN válido de 17 caracteres.')
      return
    }

    setVinLookupError('')
    setVinLookupBusy(true)
    try {
      const vehiculo = await getVehiculoPorVin(vin)
      openTransfer(vehiculo)
    } catch {
      setVinLookupError('No encontramos un pasaporte CarPass para ese VIN.')
    } finally {
      setVinLookupBusy(false)
    }
  }

  return (
    <div className={`view-container mis-autos-view ${compact ? 'mis-autos-view--compact' : ''}`}>
      {compact ? (
        <div className="mis-autos-inline-head">
          <div>
            <p className="mis-autos-inline-head__title">Flota NFT</p>
            <p className="mis-autos-inline-head__desc">
              Wallet <code>{shortAddress(address)}</code> · {cargando ? '…' : vehiculos.length} vehículo(s)
            </p>
          </div>
          <button type="button" className="btn-ghost" disabled={cargando} onClick={() => void reload()}>
            {sincronizando ? 'Sincronizando...' : 'Actualizar'}
          </button>
        </div>
      ) : (
        <header className="mis-autos-hero">
          <div className="mis-autos-hero__copy">
            <p className="mis-autos-hero__eyebrow">Garaje CarPass</p>
            <h1 className="mis-autos-hero__title">Mis vehículos</h1>
            <p className="mis-autos-hero__desc">
              NFTs detectados on-chain para <code>{shortAddress(address)}</code> en Sepolia.
            </p>
          </div>
          <div className="mis-autos-hero__meta">
            <div className="mis-autos-stat">
              <span className="mis-autos-stat__value">{cargando ? '…' : vehiculos.length}</span>
              <span className="mis-autos-stat__label">En tu wallet</span>
            </div>
            <button type="button" className="btn-ghost" disabled={cargando} onClick={() => void reload()}>
              {cargando || sincronizando ? 'Sincronizando...' : 'Actualizar'}
            </button>
          </div>
        </header>
      )}

      {sincronizando && !cargando ? (
        <div className="mis-autos-banner">
          Actualizando titularidad desde Sepolia...
        </div>
      ) : null}

      {wrongNetwork ? (
        <div className="mis-autos-banner mis-autos-banner--warn">
          Red incorrecta: cambiá a Sepolia para transferir dominio.
        </div>
      ) : null}

      {error ? (
        <div className="mis-autos-banner mis-autos-banner--error">
          <p>{error}</p>
          <button type="button" className="btn-ghost" onClick={() => void reload()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="mis-autos-vin-lookup">
        <label className="field">
          Transferir por VIN
          <div className="mis-autos-vin-lookup__row">
            <input
              className="mis-autos-vin-lookup__input"
              maxLength={17}
              placeholder="VIN de 17 caracteres"
              value={vinLookup}
              onChange={(event) => {
                setVinLookup(normalizeVin(event.target.value))
                setVinLookupError('')
              }}
              onKeyDown={(event) => event.key === 'Enter' && void buscarVinParaTransferir()}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="mis-autos-vin-lookup__btn"
              disabled={!isValidVin(vinLookup) || vinLookupBusy}
              onClick={() => void buscarVinParaTransferir()}
            >
              {vinLookupBusy ? '...' : 'Abrir transferencia'}
            </button>
          </div>
        </label>
        {vinLookupError ? <p className="error-msg">{vinLookupError}</p> : null}
      </div>

      <section className="mis-autos-fleet" aria-label="Flota NFT">
        {cargando ? <FleetSkeleton /> : null}

        {!cargando && vehiculos.length === 0 && !error ? (
          <div className="mis-autos-empty">
            <p className="mis-autos-empty__title">Tu garaje está vacío</p>
            <p className="mis-autos-empty__text">
              Cuando recibas un pasaporte CarPass en esta wallet, va a aparecer acá automáticamente.
            </p>
          </div>
        ) : null}

        {!cargando && vehiculos.length > 0 ? (
          <div className="mis-autos-grid">
            {vehiculos.map((vehicle) => (
              <MisAutoCard
                key={String(vehicle.tokenId)}
                vehicle={vehicle}
                selected={transferTarget?.tokenId === vehicle.tokenId}
                wrongNetwork={wrongNetwork}
                onViewPassport={onViewPassport}
                onTransfer={() => openTransfer(vehicle)}
              />
            ))}
          </div>
        ) : null}
      </section>

      {transferTarget ? (
        <TransferDominioSheet
          vehicle={transferTarget}
          walletAddress={address}
          wrongNetwork={wrongNetwork}
          onClose={closeTransfer}
          onTransferred={() => {
            void reload({ silent: true })
          }}
        />
      ) : null}
    </div>
  )
}
