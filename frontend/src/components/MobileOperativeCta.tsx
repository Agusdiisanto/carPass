import type { Role } from '../hooks/useCarPass'
import { buildMetaMaskOperativeLink } from '../lib/appSessionUrl'
import { shouldOfferMetaMaskDeepLink } from '../lib/ethereumProvider'
import { setPendingOperativeVin } from '../lib/operativeVinBridge'

type MobileOperativeCtaProps = {
  vin: string
  connected: boolean
  role: Role | null
  detecting: boolean
  wrongNetwork: boolean
  isOwner?: boolean
  onGoToPanel?: () => void
  onGoToMisAutos?: () => void
  onGoToTransfer?: (vin: string) => void
  onConnectWallet?: () => void
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

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 11h.01" />
    </svg>
  )
}

function TransferIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  )
}

export function MobileOperativeCta({
  vin,
  connected,
  role,
  detecting,
  wrongNetwork,
  isOwner = false,
  onGoToPanel,
  onGoToMisAutos,
  onGoToTransfer,
  onConnectWallet,
}: MobileOperativeCtaProps) {
  if (wrongNetwork) return null

  const hasOperativeRole = Boolean(role && role !== 'none')

  function handleOpenInMetaMask() {
    setPendingOperativeVin(vin)
    const link = buildMetaMaskOperativeLink(vin)
    if (link) {
      window.location.assign(link)
      return
    }
    onConnectWallet?.()
  }

  function handleGoToPanel() {
    setPendingOperativeVin(vin)
    onGoToPanel?.()
  }

  function handleGoToMisAutos() {
    setPendingOperativeVin(vin)
    onGoToMisAutos?.()
  }

  function handleGoToTransfer() {
    setPendingOperativeVin(vin)
    onGoToTransfer?.(vin)
  }

  if (connected && detecting) {
    return (
      <section className="mobile-op-cta mobile-op-cta--loading" aria-busy="true">
        <p className="mobile-op-cta__title">Verificando rol...</p>
      </section>
    )
  }

  if (connected && isOwner && onGoToTransfer) {
    return (
      <section className="mobile-op-cta mobile-op-cta--ready">
        <p className="mobile-op-cta__title">Tu pasaporte</p>
        <p className="mobile-op-cta__text">VIN <code>{vin}</code> · sos el titular NFT.</p>
        <button type="button" className="mobile-op-cta__btn" onClick={handleGoToTransfer}>
          <TransferIcon />
          Transferir
        </button>
      </section>
    )
  }

  if (connected && hasOperativeRole) {
    return (
      <section className="mobile-op-cta mobile-op-cta--ready">
        <p className="mobile-op-cta__title">Listo para operar</p>
        <p className="mobile-op-cta__text">VIN <code>{vin}</code> cargado.</p>
        <button type="button" className="mobile-op-cta__btn" onClick={handleGoToPanel}>
          <PanelIcon />
          Ir al panel
        </button>
      </section>
    )
  }

  if (connected && role === 'none') {
    return (
      <section className="mobile-op-cta mobile-op-cta--ready">
        <p className="mobile-op-cta__title">Tu pasaporte</p>
        <p className="mobile-op-cta__text">VIN <code>{vin}</code> listo para gestionar.</p>
        <button type="button" className="mobile-op-cta__btn" onClick={handleGoToMisAutos}>
          <PanelIcon />
          Ver en mis vehículos
        </button>
      </section>
    )
  }

  if (connected) return null

  return (
    <section className="mobile-op-cta mobile-op-cta--connect">
      <p className="mobile-op-cta__title">¿Operás desde el celular?</p>
      <p className="mobile-op-cta__text">
        Abrí MetaMask con la <strong>misma cuenta</strong> que en la PC. CarPass guarda el VIN en el enlace.
      </p>
      <button
        type="button"
        className="mobile-op-cta__btn mobile-op-cta__btn--wallet"
        onClick={shouldOfferMetaMaskDeepLink() ? handleOpenInMetaMask : () => onConnectWallet?.()}
      >
        <WalletIcon />
        {shouldOfferMetaMaskDeepLink() ? 'Abrir en MetaMask' : 'Conectar wallet'}
      </button>
    </section>
  )
}
