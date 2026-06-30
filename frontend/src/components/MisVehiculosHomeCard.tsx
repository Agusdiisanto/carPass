type MisVehiculosHomeCardProps = {
  walletLinked?: boolean
  wrongNetwork?: boolean
  onConnectWallet?: () => void
  onGoToMisAutos?: () => void
}

function CarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 17h14" />
      <path d="M6 11h12l1-4H5z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 11h.01" />
      <path d="M3 7V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

export function MisVehiculosHomeCard({
  walletLinked = false,
  wrongNetwork = false,
  onConnectWallet,
  onGoToMisAutos,
}: MisVehiculosHomeCardProps) {
  return (
    <section className="mis-vehiculos-home" aria-label="Mis vehículos">
      <div className="mis-vehiculos-home__icon" aria-hidden>
        <CarIcon />
      </div>
      <div className="mis-vehiculos-home__body">
        <p className="mis-vehiculos-home__eyebrow">Tu garaje CarPass</p>
        <h2 className="mis-vehiculos-home__title">Mis vehículos</h2>
        <p className="mis-vehiculos-home__text">
          {walletLinked
            ? wrongNetwork
              ? 'Conectaste una wallet, pero necesitás Sepolia para leer tu flota NFT y transferir dominio.'
              : 'Pasaportes NFT detectados on-chain para tu wallet. Consultá el historial o transferí dominio.'
            : 'Conectá MetaMask en Sepolia para ver los pasaportes CarPass asociados a tu wallet.'}
        </p>
      </div>
      <div className="mis-vehiculos-home__actions">
        {!walletLinked ? (
          <button
            type="button"
            className="mis-vehiculos-home__btn mis-vehiculos-home__btn--primary"
            onClick={onConnectWallet}
          >
            <WalletIcon />
            Conectar wallet
          </button>
        ) : (
          <button
            type="button"
            className="mis-vehiculos-home__btn mis-vehiculos-home__btn--primary"
            onClick={onGoToMisAutos}
            disabled={!onGoToMisAutos}
          >
            <CarIcon />
            Ver mis vehículos
          </button>
        )}
      </div>
    </section>
  )
}
