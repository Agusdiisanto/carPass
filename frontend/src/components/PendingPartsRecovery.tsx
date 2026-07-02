import { normalizeVin } from '../domain/carpass/formatters'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { TIPOS_PARTE } from '../domain/carpass/vehicleParts'

type PendingPartsResultProps = {
  info: VehiculoInfo
  tienePartes: boolean | null
  busy: boolean
  wrongNetwork?: boolean
  statusMessage?: string
  statusFailed?: boolean
  registeredNumeros?: string[] | null
  onRegister: () => void
  onViewPassport?: (vin: string) => void
}

export function PendingPartsResult({
  info,
  tienePartes,
  busy,
  wrongNetwork = false,
  statusMessage = '',
  statusFailed = false,
  registeredNumeros = null,
  onRegister,
  onViewPassport,
}: PendingPartsResultProps) {
  const vin = normalizeVin(info.vin)
  const completo = tienePartes === true
  const pendiente = tienePartes === false

  return (
    <div
      className={`parts-recovery-card${completo ? ' parts-recovery-card--complete' : pendiente ? ' parts-recovery-card--pending' : ''}`}
      role="status"
    >
      <div className="parts-recovery-card__header">
        <div className="parts-recovery-card__identity">
          <p className="parts-recovery-card__eyebrow">Vehículo encontrado on-chain</p>
          <h4 className="parts-recovery-card__title">
            {info.marca} {info.modelo}
          </h4>
          <p className="parts-recovery-card__meta">
            {info.anio} · {info.color}
          </p>
        </div>
        {completo ? (
          <span className="parts-recovery-card__badge parts-recovery-card__badge--ok">Completo</span>
        ) : pendiente ? (
          <span className="parts-recovery-card__badge parts-recovery-card__badge--warn">Pendiente</span>
        ) : null}
      </div>

      <div className="parts-recovery-card__vin-wrap">
        <span className="parts-recovery-card__vin-label">VIN</span>
        <code className="parts-recovery-card__vin">{vin}</code>
      </div>

      {pendiente ? (
        <>
          <div className="parts-recovery-card__notice parts-recovery-card__notice--warn">
            <strong>Faltan las 6 autopartes grabadas.</strong>
            <span>El pasaporte NFT existe, pero el historial técnico de piezas no quedó cerrado.</span>
          </div>

          <ul className="parts-recovery-card__checklist" aria-label="Autopartes a registrar">
            {TIPOS_PARTE.map((parte) => (
              <li key={parte.value}>
                <span className="parts-recovery-card__check-dot" aria-hidden />
                {parte.label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn-primary full-width parts-recovery-card__action"
            disabled={busy || wrongNetwork}
            onClick={onRegister}
          >
            {busy ? 'Grabando autopartes…' : 'Registrar 6 autopartes'}
          </button>
          {wrongNetwork ? (
            <p className="parts-recovery-card__feedback parts-recovery-card__feedback--error">
              Cambiá a Sepolia en MetaMask para firmar la transacción.
            </p>
          ) : null}
          {statusMessage ? (
            <p
              className={`parts-recovery-card__feedback parts-recovery-card__feedback--${
                busy ? 'pending' : statusFailed ? 'error' : 'success'
              }`}
              role="status"
              aria-live="polite"
            >
              {statusMessage}
            </p>
          ) : null}
          <p className="parts-recovery-card__hint">
            Se generan números de grabado automáticamente y se confirman en una sola transacción en MetaMask.
          </p>
        </>
      ) : null}

      {completo ? (
        <>
          <div className="parts-recovery-card__notice parts-recovery-card__notice--ok">
            <strong>Autopartes registradas.</strong>
            <span>Este vehículo ya tiene las 6 piezas grabadas on-chain.</span>
          </div>
          {registeredNumeros && registeredNumeros.length > 0 ? (
            <p className="parts-recovery-card__numeros">
              Grabados emitidos: {registeredNumeros.join(', ')}
            </p>
          ) : null}
          {statusMessage && !registeredNumeros ? (
            <p className="parts-recovery-card__feedback parts-recovery-card__feedback--success" role="status">
              {statusMessage}
            </p>
          ) : null}
          {onViewPassport ? (
            <button
              type="button"
              className="btn-secondary full-width parts-recovery-card__action"
              onClick={() => onViewPassport(vin)}
            >
              Ver pasaporte público
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

type PendingPartsRetryProps = {
  info: VehiculoInfo
  busy: boolean
  wrongNetwork?: boolean
  statusMessage?: string
  statusFailed?: boolean
  onRetry: () => void
}

export function PendingPartsRetry({
  info,
  busy,
  wrongNetwork = false,
  statusMessage = '',
  statusFailed = false,
  onRetry,
}: PendingPartsRetryProps) {
  return (
    <div className="parts-recovery-card parts-recovery-card--pending">
      <div className="parts-recovery-card__notice parts-recovery-card__notice--warn">
        <strong>Grabado incompleto.</strong>
        <span>
          El pasaporte de <strong>{info.marca} {info.modelo}</strong> se emitió, pero falló el registro de
          autopartes. Podés reintentarlo sin volver a registrar el vehículo.
        </span>
      </div>
      <code className="parts-recovery-card__vin">{normalizeVin(info.vin)}</code>
      <button
        type="button"
        className="btn-primary full-width parts-recovery-card__action"
        disabled={busy || wrongNetwork}
        onClick={onRetry}
      >
        {busy ? 'Grabando autopartes…' : 'Reintentar grabado de autopartes'}
      </button>
      {wrongNetwork ? (
        <p className="parts-recovery-card__feedback parts-recovery-card__feedback--error">
          Cambiá a Sepolia en MetaMask para firmar la transacción.
        </p>
      ) : null}
      {statusMessage ? (
        <p
          className={`parts-recovery-card__feedback parts-recovery-card__feedback--${
            busy ? 'pending' : statusFailed ? 'error' : 'success'
          }`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  )
}
