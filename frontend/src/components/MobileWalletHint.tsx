import { useEffect, useState, type ReactNode } from 'react'
import {
  getWalletConnectHint,
  openInMetaMaskBrowser,
  type WalletConnectionMode,
} from '../lib/ethereumProvider'
import { isIosSafari } from '../lib/deviceProfile'
import { QrCodeImage } from './QrCodeImage'

const WALLET_HINT_DISMISSED_KEY = 'carpass_wallet_hint_dismissed'
const WALLET_HINT_EXPANDED_KEY = 'carpass_wallet_hint_expanded'

type HintVisibility = 'dismissed' | 'minimized' | 'expanded'

type MobileWalletHintProps = {
  mode: WalletConnectionMode
  onOpenMetaMask?: () => void
  onConnect?: () => void | Promise<void>
  onInstallExtension?: () => void
  connecting?: boolean
  pairingUri?: string
  connectError?: string
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(WALLET_HINT_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function saveDismissed(dismissed: boolean) {
  try {
    if (dismissed) sessionStorage.setItem(WALLET_HINT_DISMISSED_KEY, '1')
    else sessionStorage.removeItem(WALLET_HINT_DISMISSED_KEY)
  } catch {
    // sessionStorage no disponible.
  }
}

function readExpandedPreference(): boolean {
  try {
    return sessionStorage.getItem(WALLET_HINT_EXPANDED_KEY) === '1'
  } catch {
    return false
  }
}

function saveExpandedPreference(expanded: boolean) {
  try {
    if (expanded) sessionStorage.setItem(WALLET_HINT_EXPANDED_KEY, '1')
    else sessionStorage.removeItem(WALLET_HINT_EXPANDED_KEY)
  } catch {
    // sessionStorage no disponible.
  }
}

function useWalletHintVisibility(connecting?: boolean, pairingUri?: string, connectError?: string) {
  const [visibility, setVisibility] = useState<HintVisibility>(() => {
    if (readDismissed()) return 'dismissed'
    return readExpandedPreference() ? 'expanded' : 'minimized'
  })

  useEffect(() => {
    if (connecting || pairingUri || connectError) {
      setVisibility((current) => (current === 'dismissed' ? 'minimized' : current === 'minimized' ? 'expanded' : current))
      saveDismissed(false)
      if (pairingUri || connectError) saveExpandedPreference(true)
    }
  }, [connecting, pairingUri, connectError])

  function dismiss() {
    setVisibility('dismissed')
    saveDismissed(true)
    saveExpandedPreference(false)
  }

  function restore() {
    setVisibility('minimized')
    saveDismissed(false)
  }

  function minimize() {
    setVisibility('minimized')
    saveExpandedPreference(false)
  }

  function expand() {
    setVisibility('expanded')
    saveExpandedPreference(true)
    saveDismissed(false)
  }

  function toggleDetails() {
    setVisibility((current) => {
      if (current === 'expanded') {
        saveExpandedPreference(false)
        return 'minimized'
      }
      saveExpandedPreference(true)
      saveDismissed(false)
      return 'expanded'
    })
  }

  return { visibility, dismiss, restore, minimize, expand, toggleDetails }
}

function MetaMaskIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4 12 2l8 2v6c0 5.2-3.4 9.8-8 11-4.6-1.2-8-5.8-8-11V4Z" fill="rgba(245, 133, 66, 0.25)" stroke="#f59e42" strokeWidth="1.5" />
      <path d="M4 4 12 9 20 4" stroke="#f59e42" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function QrActionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h2v2h-2zM20 14h1v1h-1zM14 20h2v1h-2zM20 17h1v4h-1zM17 20h4v1h-4z" />
    </svg>
  )
}

function ExtensionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
      style={up ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 3h6v6M10 14 21 3M21 10v11H3V3h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HintIconBtn({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`wallet-hint-icon-btn${active ? ' wallet-hint-icon-btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  )
}

function WalletHintRestoreChip({
  label,
  status,
  onRestore,
}: {
  label: string
  status?: string
  onRestore: () => void
}) {
  return (
    <button type="button" className="wallet-hint-restore" onClick={onRestore} aria-label={`Mostrar ${label}`}>
      <span className="wallet-hint-restore__icon" aria-hidden>
        <MetaMaskIcon size={18} />
      </span>
      <span className="wallet-hint-restore__copy">
        <strong>{label}</strong>
        {status ? <span>{status}</span> : null}
      </span>
      <span className="wallet-hint-restore__open" aria-hidden>
        <ChevronIcon />
      </span>
    </button>
  )
}

function WalletHintToolbar({
  title,
  statusLabel,
  expanded,
  onToggleDetails,
  onDismiss,
  actions,
}: {
  title: string
  statusLabel?: string
  expanded: boolean
  onToggleDetails: () => void
  onDismiss: () => void
  actions: ReactNode
}) {
  return (
    <div className="wallet-hint-toolbar">
      <div className="wallet-hint-toolbar__brand" aria-hidden>
        <MetaMaskIcon size={22} />
      </div>
      <div className="wallet-hint-toolbar__copy">
        <p className="wallet-hint-toolbar__title">{title}</p>
        {statusLabel ? <span className="wallet-hint-toolbar__status">{statusLabel}</span> : null}
      </div>
      <div className="wallet-hint-toolbar__actions">
        {actions}
        <HintIconBtn title={expanded ? 'Ocultar detalles' : 'Ver detalles'} onClick={onToggleDetails} active={expanded}>
          <ChevronIcon up={expanded} />
        </HintIconBtn>
        <HintIconBtn title="Ocultar aviso" onClick={onDismiss}>
          <CloseIcon />
        </HintIconBtn>
      </div>
    </div>
  )
}

function DesktopConnectPanel({
  hint,
  connecting,
  pairingUri,
  connectError,
  onConnect,
  onInstallExtension,
}: {
  hint: string
  connecting?: boolean
  pairingUri?: string
  connectError?: string
  onConnect?: () => void | Promise<void>
  onInstallExtension?: () => void
}) {
  const showQr = Boolean(pairingUri)
  const { visibility, dismiss, restore, expand, toggleDetails } = useWalletHintVisibility(connecting, pairingUri, connectError)

  function handleConnectClick() {
    expand()
    void onConnect?.()
  }

  if (visibility === 'dismissed') {
    return (
      <WalletHintRestoreChip
        label="Wallet pendiente"
        status={connecting ? 'Conectando…' : 'Conectar con QR o extensión'}
        onRestore={restore}
      />
    )
  }

  const expanded = visibility === 'expanded'
  const statusLabel = connecting ? 'Conectando' : 'Pendiente'

  return (
    <section
      className={`mobile-wallet-hint mobile-wallet-hint--desktop-install${expanded ? ' mobile-wallet-hint--expanded' : ' mobile-wallet-hint--minimized'}`}
      aria-label="Conexion wallet desktop"
    >
      <WalletHintToolbar
        title="Conectá sin extensión"
        statusLabel={statusLabel}
        expanded={expanded}
        onToggleDetails={toggleDetails}
        onDismiss={dismiss}
        actions={
          <>
            <HintIconBtn
              title={connecting ? 'Generando QR…' : showQr ? 'Regenerar QR' : 'Conectar con QR'}
              onClick={handleConnectClick}
              disabled={connecting}
              active={showQr}
            >
              <QrActionIcon />
            </HintIconBtn>
            <HintIconBtn title="Instalar extensión MetaMask" onClick={() => onInstallExtension?.()}>
              <ExtensionIcon />
            </HintIconBtn>
          </>
        }
      />

      {connectError && !expanded ? <p className="mobile-wallet-hint__error mobile-wallet-hint__error--inline">{connectError}</p> : null}

      {expanded ? (
        <div id="wallet-hint-panel" className="mobile-wallet-hint__panel">
          <p className="mobile-wallet-hint__text">{hint}</p>
          <div className={`mobile-wallet-hint__body${showQr ? ' mobile-wallet-hint__body--with-qr' : ''}`}>
            <ol className="mobile-wallet-hint__steps">
              <li>
                <span className="mobile-wallet-hint__step-num">1</span>
                <span>Tocá el ícono QR y abrí MetaMask mobile.</span>
              </li>
              <li>
                <span className="mobile-wallet-hint__step-num">2</span>
                <span>En MetaMask, escaneá el código de esta pantalla.</span>
              </li>
              <li>
                <span className="mobile-wallet-hint__step-num">3</span>
                <span>Aprobá la conexión y cambiá a Sepolia.</span>
              </li>
            </ol>

            {showQr ? (
              <div className="mobile-wallet-hint__qr-panel">
                <QrCodeImage value={pairingUri ?? ''} size={168} label="QR para conectar MetaMask mobile" />
                <p className="mobile-wallet-hint__qr-caption">Escanealo desde MetaMask mobile, no desde la cámara común</p>
              </div>
            ) : null}
          </div>

          {connectError ? <p className="mobile-wallet-hint__error">{connectError}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

function MobileConnectPanel({
  hint,
  iosSafari,
  onOpenMetaMask,
  connecting,
  pairingUri,
  connectError,
}: {
  hint: string
  iosSafari: boolean
  onOpenMetaMask?: () => void
  connecting?: boolean
  pairingUri?: string
  connectError?: string
}) {
  const { visibility, dismiss, restore, toggleDetails } = useWalletHintVisibility(connecting, pairingUri, connectError)
  const title = iosSafari ? 'Safari solo consulta' : 'Operar con MetaMask'
  const summary = iosSafari
    ? 'Consultá VIN sin wallet. Abrí MetaMask para firmar.'
    : 'Abrí CarPass en el navegador de MetaMask mobile.'

  function handlePrimary() {
    onOpenMetaMask?.()
    openInMetaMaskBrowser()
  }

  if (visibility === 'dismissed') {
    return (
      <WalletHintRestoreChip
        label={iosSafari ? 'Operar en MetaMask' : 'Wallet mobile'}
        status="Tocá para ver opciones"
        onRestore={restore}
      />
    )
  }

  const expanded = visibility === 'expanded'

  return (
    <section
      className={`mobile-wallet-hint mobile-wallet-hint--mobile-deeplink${expanded ? ' mobile-wallet-hint--expanded' : ' mobile-wallet-hint--minimized'}`}
      aria-label="Conexion wallet mobile"
    >
      <WalletHintToolbar
        title={title}
        expanded={expanded}
        onToggleDetails={toggleDetails}
        onDismiss={dismiss}
        actions={
          <HintIconBtn title="Abrir en MetaMask" onClick={handlePrimary}>
            <OpenIcon />
          </HintIconBtn>
        }
      />

      {expanded ? (
        <div id="wallet-hint-panel-mobile" className="mobile-wallet-hint__panel">
          <p className="mobile-wallet-hint__text">{iosSafari ? summary : hint}</p>
        </div>
      ) : null}
    </section>
  )
}

export function MobileWalletHint({
  mode,
  onOpenMetaMask,
  onConnect,
  onInstallExtension,
  connecting,
  pairingUri,
  connectError,
}: MobileWalletHintProps) {
  if (mode === 'injected') return null

  const hint = getWalletConnectHint(mode)
  const isMobile = mode === 'mobile-deeplink'
  const iosSafari = isMobile && isIosSafari()

  if (mode === 'desktop-install') {
    return (
      <DesktopConnectPanel
        hint={hint}
        connecting={connecting}
        pairingUri={pairingUri}
        connectError={connectError}
        onConnect={onConnect}
        onInstallExtension={onInstallExtension}
      />
    )
  }

  return (
    <MobileConnectPanel
      hint={hint}
      iosSafari={iosSafari}
      onOpenMetaMask={onOpenMetaMask}
      connecting={connecting}
      pairingUri={pairingUri}
      connectError={connectError}
    />
  )
}
