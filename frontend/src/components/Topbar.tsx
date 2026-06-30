import type { ReactNode } from 'react'
import type { Role } from '../hooks/useCarPass'
import { ROLE_BADGE_CLASS, ROLE_LABELS } from '../domain/carpass/roles'
import type { WalletConnectionMode } from '../lib/ethereumProvider'
import { shortAddress } from '../hooks/useWallet'
import { CarPassLogoMark } from './CarPassLogo'

type TopbarProps = {
  connected: boolean
  walletLinked?: boolean
  wrongNetwork: boolean
  address: string
  role: Role | null
  detecting: boolean
  showPublic: boolean
  showMisAutos?: boolean
  needsMobileWallet?: boolean
  connectionMode?: WalletConnectionMode
  onGoHome: () => void
  onShowPublic: () => void
  onShowMisAutos?: () => void
  onShowPanel: () => void
  onConnect: () => void
  onDisconnect: () => void
}

function LogOutIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 11h.01" />
      <path d="M3 7V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function SearchNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function CarNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 17h14" />
      <path d="M6 11h12l1-4H5z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </svg>
  )
}

function PanelNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

type NavButtonProps = {
  active: boolean
  label: string
  onClick: () => void
  icon: ReactNode
  chip?: string
  chipClass?: string
  disabled?: boolean
  title?: string
}

function NavButton({ active, label, onClick, icon, chip, chipClass, disabled = false, title }: NavButtonProps) {
  return (
    <button
      type="button"
      className={`topbar-nav-btn ${active ? 'active' : ''} ${disabled ? 'topbar-nav-btn--disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      <span>{label}</span>
      {chip ? <span className={`topbar-nav-chip ${chipClass ?? ''}`}>{chip}</span> : null}
    </button>
  )
}

export function Topbar({
  connected,
  walletLinked: walletLinkedProp,
  wrongNetwork,
  address,
  role,
  detecting,
  showPublic,
  showMisAutos = false,
  needsMobileWallet = false,
  connectionMode = 'injected',
  onGoHome,
  onShowPublic,
  onShowMisAutos,
  onShowPanel,
  onConnect,
  onDisconnect,
}: TopbarProps) {
  const walletLinked = walletLinkedProp ?? Boolean(address)
  const panelActive = walletLinked && !showPublic && !showMisAutos
  const misAutosActive = walletLinked && showMisAutos
  const consultaActive = (showPublic && !showMisAutos) || !walletLinked
  const walletStatus = !walletLinked ? 'neutral' : wrongNetwork ? 'warn' : connected ? 'ok' : 'warn'
  const showRoleChip = Boolean(panelActive && role && role !== 'none' && !detecting)
  const walletActionLabel = connected
    ? shortAddress(address)
    : walletLinked && wrongNetwork
      ? 'Red incorrecta'
      : needsMobileWallet
        ? 'Abrir MetaMask'
        : connectionMode === 'desktop-install'
          ? 'Conectar wallet'
          : 'Conectar wallet'

  function handleWalletClick() {
    if (connected) {
      if (role === 'none') {
        onShowMisAutos?.()
        return
      }
      onShowPanel()
      return
    }
    if (walletLinked && wrongNetwork) {
      if (role === 'none') {
        onShowMisAutos?.()
        return
      }
      onShowPanel()
      return
    }
    onConnect()
  }

  const operarChip = (() => {
    if (!walletLinked) return undefined
    if (detecting) return '...'
    if (wrongNetwork) return 'Red'
    if (role && role !== 'none') return ROLE_LABELS[role]
    if (!connected) return undefined
    return 'Sin rol'
  })()

  const navProps = {
    consultaActive,
    misAutosActive,
    panelActive,
    walletLinked,
    connected,
    wrongNetwork,
    showRoleChip,
    role,
    operarChip,
    onShowPublic,
    onShowMisAutos,
    onShowPanel,
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-glow" aria-hidden />

        <button type="button" className="brand" onClick={onGoHome} aria-label="Ir al inicio de CarPass">
          <span className="brand-mark-wrap" aria-hidden>
            <CarPassLogoMark className="brand-mark" />
          </span>
          <span className="brand-title">
            <span className="brand-title-car">Car</span>
            <span className="brand-accent">Pass</span>
          </span>
        </button>

        <div className="topbar-end">
          {connected ? (
            <button
              type="button"
              className="btn-disconnect"
              onClick={onDisconnect}
              title="Desconectar wallet"
              aria-label="Desconectar wallet"
            >
              <LogOutIcon />
            </button>
          ) : null}
          <button
            type="button"
            className={`btn-wallet btn-wallet--${walletStatus} ${connected ? 'connected' : ''}`}
            onClick={handleWalletClick}
            title={
              wrongNetwork
                ? 'Red incorrecta — cambiá a Sepolia o entrá al panel'
                : connected
                  ? role === 'none'
                    ? 'Ir a mis vehículos'
                    : 'Ir al panel operativo'
                  : needsMobileWallet
                    ? 'Abrir CarPass en MetaMask mobile'
                    : connectionMode === 'desktop-install'
                      ? 'Conectar con MetaMask mobile (QR)'
                      : 'Conectar MetaMask'
            }
          >
            {!connected ? null : (
              <span className={`wallet-status-dot wallet-status-dot--${walletStatus}`} aria-hidden />
            )}
            <span className="btn-wallet-icon" aria-hidden>
              <WalletIcon />
            </span>
            <span className="btn-wallet-label">
              {walletActionLabel}
            </span>
          </button>
        </div>
      </header>

      <nav className={`topbar-dock ${walletLinked ? 'topbar-dock--linked' : ''}`} aria-label="Navegacion mobile">
        <TopbarNavItems {...navProps} variant="dock" />
      </nav>
    </>
  )
}

function panelNavLabel(role: Role | null, variant: 'desktop' | 'dock'): string {
  if (!role || role === 'none') return variant === 'dock' ? 'Operar' : 'Operar'

  const dockLabels: Partial<Record<Role, string>> = {
    admin: 'Admin',
    registrador: 'Alta',
    mecanico: 'Taller',
    aseguradora: 'Siniestros',
    inspector: 'VTV',
  }

  const desktopLabels: Partial<Record<Role, string>> = {
    admin: 'Administrar',
    registrador: 'Registro',
    mecanico: 'Taller',
    aseguradora: 'Siniestros',
    inspector: 'VTV',
  }

  return variant === 'dock'
    ? (dockLabels[role] ?? ROLE_LABELS[role])
    : (desktopLabels[role] ?? ROLE_LABELS[role])
}

function TopbarNavItems({
  consultaActive,
  misAutosActive,
  panelActive,
  walletLinked,
  wrongNetwork,
  showRoleChip,
  role,
  operarChip,
  onShowPublic,
  onShowMisAutos,
  onShowPanel,
  variant = 'desktop',
}: {
  consultaActive: boolean
  misAutosActive: boolean
  panelActive: boolean
  walletLinked: boolean
  wrongNetwork: boolean
  showRoleChip: boolean
  role: Role | null
  operarChip?: string
  onShowPublic: () => void
  onShowMisAutos?: () => void
  onShowPanel: () => void
  variant?: 'desktop' | 'dock'
}) {
  const consultaLabel = variant === 'dock' ? 'Consulta' : 'Consulta'
  const misAutosLabel = variant === 'dock' ? 'Garaje' : 'Mis vehículos'
  const operarLabel = panelNavLabel(role, variant)
  const showOperarNav = Boolean(role && role !== 'none')

  return (
    <>
      <NavButton
        active={consultaActive}
        label={consultaLabel}
        onClick={onShowPublic}
        icon={<SearchNavIcon />}
      />
      {walletLinked && onShowMisAutos ? (
        <NavButton
          active={misAutosActive}
          label={misAutosLabel}
          onClick={onShowMisAutos}
          icon={<CarNavIcon />}
          title="Pasaportes NFT de tu wallet"
        />
      ) : null}
      {walletLinked && showOperarNav ? (
        <NavButton
          active={panelActive}
          label={operarLabel}
          onClick={onShowPanel}
          icon={<PanelNavIcon />}
          disabled={!walletLinked}
          title={
            wrongNetwork
              ? 'Cambia a Sepolia en MetaMask para operar'
              : panelActive
                ? role === 'admin' ? 'Panel de administración' : 'Panel operativo'
                : role === 'admin' ? 'Ir al panel de administración' : 'Ir al panel operativo'
          }
          chip={
            operarChip ??
            (wrongNetwork ? 'Red' : undefined)
          }
          chipClass={
            wrongNetwork
              ? 'warn'
              : showRoleChip && role
                ? ROLE_BADGE_CLASS[role]
                : operarChip === 'Sin rol'
                  ? 'neutral'
                  : undefined
          }
        />
      ) : null}
    </>
  )
}
