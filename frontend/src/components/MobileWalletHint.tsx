import { useEffect, useState } from 'react'
import {
  getWalletConnectHint,
  openInMetaMaskBrowser,
  type WalletConnectionMode,
} from '../lib/ethereumProvider'
import { isIosSafari } from '../lib/deviceProfile'
import { QrCodeImage } from './QrCodeImage'

const WALLET_HINT_COLLAPSED_KEY = 'carpass_wallet_hint_collapsed'

type MobileWalletHintProps = {
  mode: WalletConnectionMode
  onOpenMetaMask?: () => void
  onConnect?: () => void | Promise<void>
  onInstallExtension?: () => void
  connecting?: boolean
  pairingUri?: string
  connectError?: string
}

function readCollapsedPreference(): boolean {
  try {
    return sessionStorage.getItem(WALLET_HINT_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function saveCollapsedPreference(collapsed: boolean) {
  try {
    if (collapsed) sessionStorage.setItem(WALLET_HINT_COLLAPSED_KEY, '1')
    else sessionStorage.removeItem(WALLET_HINT_COLLAPSED_KEY)
  } catch {
    // sessionStorage no disponible.
  }
}

function MetaMaskIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4 12 2l8 2v6c0 5.2-3.4 9.8-8 11-4.6-1.2-8-5.8-8-11V4Z" fill="rgba(245, 133, 66, 0.25)" stroke="#f59e42" strokeWidth="1.5" />
      <path d="M4 4 12 9 20 4" stroke="#f59e42" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <span className={`mobile-wallet-hint__chevron-wrap${expanded ? ' mobile-wallet-hint__chevron-wrap--open' : ''}`} aria-hidden>
      <svg className="mobile-wallet-hint__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function useWalletHintExpanded(connecting?: boolean, pairingUri?: string, connectError?: string) {
  const [expanded, setExpanded] = useState(() => !readCollapsedPreference())

  useEffect(() => {
    if (connecting || pairingUri || connectError) {
      setExpanded(true)
      saveCollapsedPreference(false)
    }
  }, [connecting, pairingUri, connectError])

  function expand() {
    setExpanded(true)
    saveCollapsedPreference(false)
  }

  function toggleExpanded() {
    setExpanded((current) => {
      const next = !current
      saveCollapsedPreference(!next)
      return next
    })
  }

  return { expanded, expand, toggleExpanded }
}

function WalletHintHeader({
  expanded,
  onToggle,
  panelId,
  label,
  eyebrow,
  title,
  summary,
  description,
  statusLabel = 'Sin conectar',
}: {
  expanded: boolean
  onToggle: () => void
  panelId: string
  label: string
  eyebrow: string
  title: string
  summary: string
  description?: string
  statusLabel?: string
}) {
  return (
    <div className="mobile-wallet-hint__header-row">
      <button
        type="button"
        className="mobile-wallet-hint__header"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={expanded ? `Ocultar ${label}` : `Mostrar ${label}`}
      >
        <div className="mobile-wallet-hint__icon" aria-hidden>
          <MetaMaskIcon />
        </div>
        <div className="mobile-wallet-hint__copy">
          <div className="mobile-wallet-hint__title-row">
            <p className="mobile-wallet-hint__eyebrow">{eyebrow}</p>
            <span className="mobile-wallet-hint__status">{statusLabel}</span>
          </div>
          <p className="mobile-wallet-hint__title">{title}</p>
          {expanded && description ? <p className="mobile-wallet-hint__text">{description}</p> : null}
          {!expanded ? <p className="mobile-wallet-hint__summary">{summary}</p> : null}
        </div>
        <span className="mobile-wallet-hint__expand-pill">
          <span className="mobile-wallet-hint__expand-label">{expanded ? 'Menos' : 'Mas'}</span>
          <ExpandChevron expanded={expanded} />
        </span>
      </button>
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
  const { expanded, expand, toggleExpanded } = useWalletHintExpanded(connecting, pairingUri, connectError)

  function handleConnectClick() {
    expand()
    void onConnect?.()
  }

  return (
    <section
      className={`mobile-wallet-hint mobile-wallet-hint--desktop-install${expanded ? ' mobile-wallet-hint--expanded' : ' mobile-wallet-hint--collapsed'}`}
      aria-label="Conexion wallet desktop"
    >
      <WalletHintHeader
        expanded={expanded}
        onToggle={toggleExpanded}
        panelId="wallet-hint-panel"
        label="panel de conexion wallet"
        eyebrow="Wallet"
        title="Conectá sin extensión"
        summary="Escaneá QR con MetaMask mobile o instalá la extensión"
        description={hint}
        statusLabel={connecting ? 'Conectando' : 'Pendiente'}
      />

      {connectError && !expanded ? <p className="mobile-wallet-hint__error mobile-wallet-hint__error--inline">{connectError}</p> : null}

      {!expanded ? (
        <div className="mobile-wallet-hint__collapsed-bar">
          <button
            type="button"
            className="mobile-wallet-hint__btn mobile-wallet-hint__btn--primary mobile-wallet-hint__btn--compact"
            onClick={handleConnectClick}
            disabled={connecting}
          >
            {connecting ? 'Generando QR…' : 'Conectar con QR'}
          </button>
          <button
            type="button"
            className="mobile-wallet-hint__btn mobile-wallet-hint__btn--ghost mobile-wallet-hint__btn--compact"
            onClick={() => onInstallExtension?.()}
          >
            Extensión
          </button>
        </div>
      ) : null}

      {expanded ? (
        <div id="wallet-hint-panel" className="mobile-wallet-hint__panel">
          <div className={`mobile-wallet-hint__body${showQr ? ' mobile-wallet-hint__body--with-qr' : ''}`}>
            <ol className="mobile-wallet-hint__steps">
              <li>
                <span className="mobile-wallet-hint__step-num">1</span>
                <span>Tocá conectar y escaneá el QR con MetaMask mobile.</span>
              </li>
              <li>
                <span className="mobile-wallet-hint__step-num">2</span>
                <span>Aprobá la conexión en el celular (red Sepolia).</span>
              </li>
            </ol>

            {showQr ? (
              <div className="mobile-wallet-hint__qr-panel">
                <QrCodeImage value={pairingUri ?? ''} size={168} label="QR para conectar MetaMask mobile" />
                <p className="mobile-wallet-hint__qr-caption">Escaneá con la cámara de MetaMask</p>
              </div>
            ) : null}
          </div>

          {connectError ? <p className="mobile-wallet-hint__error">{connectError}</p> : null}

          <div className="mobile-wallet-hint__actions">
            <button
              type="button"
              className="mobile-wallet-hint__btn mobile-wallet-hint__btn--primary"
              onClick={handleConnectClick}
              disabled={connecting}
            >
              {connecting ? 'Esperando aprobación…' : showQr ? 'Regenerar QR' : 'Conectar con MetaMask mobile'}
            </button>
            <button
              type="button"
              className="mobile-wallet-hint__btn mobile-wallet-hint__btn--ghost"
              onClick={() => onInstallExtension?.()}
            >
              Instalar extensión
            </button>
          </div>
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
  const { expanded, toggleExpanded } = useWalletHintExpanded(connecting, pairingUri, connectError)
  const title = iosSafari ? 'Safari no tiene MetaMask' : 'Conectá desde MetaMask mobile'
  const summary = iosSafari ? 'Consultá VIN sin wallet · Abrí en MetaMask para operar' : 'Abrí CarPass en el navegador de MetaMask'

  function handlePrimary() {
    onOpenMetaMask?.()
    openInMetaMaskBrowser()
  }

  return (
    <section
      className={`mobile-wallet-hint mobile-wallet-hint--mobile-deeplink${expanded ? ' mobile-wallet-hint--expanded' : ' mobile-wallet-hint--collapsed'}`}
      aria-label="Conexion wallet mobile"
    >
      <WalletHintHeader
        expanded={expanded}
        onToggle={toggleExpanded}
        panelId="wallet-hint-panel-mobile"
        label="panel de conexion mobile"
        eyebrow="Mobile"
        title={title}
        summary={summary}
        description={
          iosSafari
            ? 'Consultá VIN sin wallet. Para operar, tocá Abrir en MetaMask: la app abre CarPass con tu wallet lista.'
            : hint
        }
      />

      {!expanded ? (
        <div className="mobile-wallet-hint__collapsed-bar">
          <button type="button" className="mobile-wallet-hint__btn mobile-wallet-hint__btn--primary mobile-wallet-hint__btn--compact" onClick={handlePrimary}>
            Abrir en MetaMask
          </button>
        </div>
      ) : null}

      {expanded ? (
        <div id="wallet-hint-panel-mobile" className="mobile-wallet-hint__panel">
          <div className="mobile-wallet-hint__actions mobile-wallet-hint__actions--single">
            <button type="button" className="mobile-wallet-hint__btn mobile-wallet-hint__btn--primary" onClick={handlePrimary}>
              Abrir en MetaMask
            </button>
          </div>
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
