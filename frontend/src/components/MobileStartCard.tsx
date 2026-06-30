import { openInMetaMaskBrowser, shouldOfferMetaMaskDeepLink } from '../lib/ethereumProvider'
import { isIosSafari } from '../lib/deviceProfile'

type MobileStartCardProps = {
  connected: boolean
  onScan: () => void
  onConnectWallet?: () => void
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

function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 11h.01" />
      <path d="M3 7V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

export function MobileStartCard({ connected, onScan, onConnectWallet }: MobileStartCardProps) {
  const needsMetaMaskApp = shouldOfferMetaMaskDeepLink()

  function handleWallet() {
    if (needsMetaMaskApp) {
      onConnectWallet?.()
      openInMetaMaskBrowser()
      return
    }
    onConnectWallet?.()
  }

  return (
    <section className="mobile-start-card" aria-label="Inicio en celular">
      <p className="mobile-start-card__eyebrow">Modo celular</p>
      <h2 className="mobile-start-card__title">3 pasos</h2>

      <ol className="mobile-start-card__steps">
        <li>
          <span className="mobile-start-card__step-num">1</span>
          <div>
            <strong>Escanear</strong>
            <span>QR del pasaporte o VIN — no hace falta wallet.</span>
          </div>
        </li>
        <li>
          <span className="mobile-start-card__step-num">2</span>
          <div>
            <strong>Operar</strong>
            <span>{isIosSafari() ? 'Abrí en MetaMask mobile.' : 'Conectá MetaMask.'}</span>
          </div>
        </li>
        <li>
          <span className="mobile-start-card__step-num">3</span>
          <div>
            <strong>Misma cuenta</strong>
            <span>Usá la wallet que tenés en la PC.</span>
          </div>
        </li>
      </ol>

      <div className="mobile-start-card__actions">
        <button type="button" className="mobile-start-card__btn mobile-start-card__btn--scan" onClick={onScan}>
          <QrIcon />
          Escanear QR
        </button>
        {!connected ? (
          <button
            type="button"
            className="mobile-start-card__btn mobile-start-card__btn--wallet"
            onClick={handleWallet}
          >
            <WalletIcon />
            {needsMetaMaskApp ? 'Abrir MetaMask' : 'Conectar'}
          </button>
        ) : null}
      </div>
    </section>
  )
}
