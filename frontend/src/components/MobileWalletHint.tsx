import {
  getWalletConnectHint,
  openInMetaMaskBrowser,
  type WalletConnectionMode,
} from '../lib/ethereumProvider'
import { isIosSafari } from '../lib/deviceProfile'
import { QrCodeImage } from './QrCodeImage'

type MobileWalletHintProps = {
  mode: WalletConnectionMode
  onOpenMetaMask?: () => void
  onConnect?: () => void | Promise<void>
  onInstallExtension?: () => void
  connecting?: boolean
  pairingUri?: string
  connectError?: string
}

function MetaMaskIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4 12 2l8 2v6c0 5.2-3.4 9.8-8 11-4.6-1.2-8-5.8-8-11V4Z" fill="rgba(245, 133, 66, 0.25)" stroke="#f59e42" strokeWidth="1.5" />
      <path d="M4 4 12 9 20 4" stroke="#f59e42" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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

  return (
    <section className="mobile-wallet-hint mobile-wallet-hint--desktop-install" aria-label="Conexion wallet desktop">
      <div className="mobile-wallet-hint__hero">
        <div className="mobile-wallet-hint__icon mobile-wallet-hint__icon--large" aria-hidden>
          <MetaMaskIcon />
        </div>
        <div className="mobile-wallet-hint__copy">
          <p className="mobile-wallet-hint__eyebrow">Wallet</p>
          <p className="mobile-wallet-hint__title">Conectá sin extensión</p>
          <p className="mobile-wallet-hint__text">{hint}</p>
        </div>
      </div>

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
          onClick={() => void onConnect?.()}
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

  function handlePrimary() {
    onOpenMetaMask?.()
    openInMetaMaskBrowser()
  }

  return (
    <section className={`mobile-wallet-hint mobile-wallet-hint--${mode}`} aria-label="Conexion wallet mobile">
      <div className="mobile-wallet-hint__hero">
        <div className="mobile-wallet-hint__icon" aria-hidden>
          <MetaMaskIcon />
        </div>
        <div className="mobile-wallet-hint__copy">
          <p className="mobile-wallet-hint__eyebrow">Mobile</p>
          <p className="mobile-wallet-hint__title">
            {iosSafari ? 'Safari no tiene MetaMask' : 'Conectá desde MetaMask mobile'}
          </p>
          <p className="mobile-wallet-hint__text">
            {iosSafari
              ? 'Consultá VIN sin wallet. Para operar, tocá Abrir en MetaMask: la app abre CarPass con tu wallet lista.'
              : hint}
          </p>
        </div>
      </div>
      <div className="mobile-wallet-hint__actions mobile-wallet-hint__actions--single">
        <button type="button" className="mobile-wallet-hint__btn mobile-wallet-hint__btn--primary" onClick={handlePrimary}>
          Abrir en MetaMask
        </button>
      </div>
    </section>
  )
}
