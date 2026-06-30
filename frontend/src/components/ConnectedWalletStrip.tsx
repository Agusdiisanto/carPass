import type { Role } from '../hooks/useCarPass'
import { ROLE_BADGE_CLASS, ROLE_CAPABILITIES, ROLE_LABELS } from '../domain/carpass/roles'

type ConnectedWalletStripProps = {
  role: Role | null
  detecting: boolean
  wrongNetwork: boolean
  onGoToPanel?: () => void
  onGoToMisAutos?: () => void
  onScanQr: () => void
  showPhoneCompanion?: boolean
  onReceiveFromPhone?: () => void
  onSwitchNetwork?: () => void | Promise<void>
}

function QrIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 17h14" />
      <path d="M6 11h12l1-4H5z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function PhoneLinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
      <path d="M14 9l3 3-3 3" />
      <path d="M17 12H9" />
    </svg>
  )
}

export function ConnectedWalletStrip({
  role,
  detecting,
  wrongNetwork,
  onGoToPanel,
  onGoToMisAutos,
  onScanQr,
  showPhoneCompanion = false,
  onReceiveFromPhone,
  onSwitchNetwork,
}: ConnectedWalletStripProps) {
  if (wrongNetwork) {
    return (
      <div className="wallet-strip wallet-strip--warn">
        <p className="wallet-strip__title">Red incorrecta</p>
        <p className="wallet-strip__text">
          Cambiá a Sepolia en MetaMask para firmar transacciones. Podés entrar al panel en modo lectura.
        </p>
        <div className="wallet-strip__actions">
          {onSwitchNetwork ? (
            <button type="button" className="wallet-strip__btn wallet-strip__btn--primary" onClick={() => void onSwitchNetwork()}>
              Cambiar a Sepolia
            </button>
          ) : null}
          {onGoToMisAutos ? (
            <button type="button" className="wallet-strip__btn wallet-strip__btn--ghost" onClick={onGoToMisAutos}>
              <CarIcon />
              Mis vehículos
            </button>
          ) : null}
          {onGoToPanel ? (
            <button type="button" className="wallet-strip__btn wallet-strip__btn--ghost" onClick={onGoToPanel}>
              <PanelIcon />
              {role === 'admin' ? 'Ver administración' : 'Ver panel'}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  if (detecting) {
    return (
      <div className="wallet-strip wallet-strip--loading" aria-busy="true">
        <div className="wallet-strip__shimmer" aria-hidden />
        <p className="wallet-strip__title">Verificando permisos on-chain...</p>
        <p className="wallet-strip__text">Un momento mientras detectamos tu rol operativo.</p>
      </div>
    )
  }

  if (!role || role === 'none') {
    return (
      <div className="wallet-strip wallet-strip--neutral">
        <div className="wallet-strip__head">
          <p className="wallet-strip__title">Wallet conectada · solo lectura</p>
          <span className="wallet-strip__pill">Sin rol operativo</span>
        </div>
        <p className="wallet-strip__text">
          Podés consultar VIN y escanear QR. Para dar de alta o cargar hitos, pedí un rol al administrador.
        </p>
        <div className="wallet-strip__actions">
          {onGoToMisAutos ? (
            <button type="button" className="wallet-strip__btn wallet-strip__btn--primary" onClick={onGoToMisAutos}>
              <CarIcon />
              Mis vehículos
            </button>
          ) : null}
          {showPhoneCompanion && onReceiveFromPhone ? (
            <button type="button" className="wallet-strip__btn wallet-strip__btn--primary" onClick={onReceiveFromPhone}>
              <PhoneLinkIcon />
              Recibir del celular
            </button>
          ) : null}
          <button type="button" className="wallet-strip__btn wallet-strip__btn--ghost" onClick={onScanQr}>
            <QrIcon />
            Escanear QR
          </button>
        </div>
      </div>
    )
  }

  const badgeClass = ROLE_BADGE_CLASS[role]
  const caps = ROLE_CAPABILITIES[role].slice(0, role === 'admin' ? 3 : 2)
  const panelLabel = role === 'admin' ? 'Ir a administración' : 'Ir a operar'

  return (
    <div className={`wallet-strip wallet-strip--role wallet-strip--${badgeClass}`}>
      <div className="wallet-strip__head">
        <div>
          <p className="wallet-strip__eyebrow">{role === 'admin' ? 'Acceso administrador' : 'Modo operativo'}</p>
          <p className="wallet-strip__title">
            Rol: <span className={`wallet-strip__role ${badgeClass}`}>{ROLE_LABELS[role]}</span>
          </p>
        </div>
        <span className={`wallet-strip__pill wallet-strip__pill--${badgeClass}`}>{ROLE_LABELS[role]}</span>
      </div>
      <p className="wallet-strip__text">{caps.join(' · ')}</p>
      <div className="wallet-strip__actions">
        {onGoToMisAutos ? (
          <button type="button" className="wallet-strip__btn wallet-strip__btn--primary" onClick={onGoToMisAutos}>
            <CarIcon />
            Mis vehículos
          </button>
        ) : null}
        {onGoToPanel ? (
          <button type="button" className="wallet-strip__btn wallet-strip__btn--ghost" onClick={onGoToPanel}>
            <PanelIcon />
            {panelLabel}
          </button>
        ) : null}
        {showPhoneCompanion && onReceiveFromPhone ? (
          <button type="button" className="wallet-strip__btn wallet-strip__btn--ghost" onClick={onReceiveFromPhone}>
            <PhoneLinkIcon />
            Recibir del celular
          </button>
        ) : null}
        <button type="button" className="wallet-strip__btn wallet-strip__btn--ghost" onClick={onScanQr}>
          <QrIcon />
          {showPhoneCompanion ? 'Escanear con camara' : 'Escanear QR de VIN'}
        </button>
      </div>
    </div>
  )
}
