import type { ReactNode } from 'react'
import { CONTRACT_ADDRESS, hasContractAddress, type Role } from '../hooks/useCarPass'
import { expectedChainId } from '../hooks/useWallet'

type Status = 'ok' | 'warn' | 'neutral'

type RuntimeStripProps = {
  connected: boolean
  wrongNetwork: boolean
  chainId: number | null
  address: string
  role: Role | null
  detecting: boolean
}

const EXPLORER_CONTRACT = `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`
const EXPLORER_SEPOLIA = 'https://sepolia.etherscan.io/'

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 11h.01" />
    </svg>
  )
}

function ContractIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function NetworkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

type DockLinkProps = {
  icon: ReactNode
  label: string
  href: string
  status: Status
}

function DockLink({ icon, label, href, status }: DockLinkProps) {
  return (
    <a
      className={`runtime-dock-item runtime-dock-item--${status}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
    >
      <span className="runtime-dock-item__trigger">{icon}</span>
      <span className="runtime-dock-item__dot" aria-hidden />
    </a>
  )
}

export function RuntimeStrip({
  connected,
  wrongNetwork,
  address,
}: RuntimeStripProps) {
  if (!hasContractAddress) return null

  const mode = connected ? (wrongNetwork ? 'warn' : 'operativo') : 'publico'
  const modeLabel =
    mode === 'operativo' ? 'Operativo' : mode === 'warn' ? 'Red incorrecta' : 'Consulta publica'

  const networkStatus: Status = connected ? (wrongNetwork ? 'warn' : 'ok') : 'ok'
  const walletExplorer = address ? `https://sepolia.etherscan.io/address/${address}` : ''

  return (
    <section className="runtime-dock" aria-label="Estado on-chain CarPass">
      <div className="runtime-dock__bar">
        <div className="runtime-dock__meta">
          <span className={`runtime-dock__mode runtime-dock__mode--${mode}`}>{modeLabel}</span>
          <span className="runtime-dock__chain">Sepolia · {expectedChainId}</span>
        </div>

        <div className="runtime-dock__tools">
          {connected && walletExplorer ? (
            <DockLink
              icon={<WalletIcon />}
              label="Ver tu wallet en Etherscan"
              href={walletExplorer}
              status={wrongNetwork ? 'warn' : 'ok'}
            />
          ) : null}
          <DockLink
            icon={<ContractIcon />}
            label="Ver contrato en Etherscan"
            href={EXPLORER_CONTRACT}
            status="ok"
          />
          <DockLink
            icon={<NetworkIcon />}
            label="Abrir explorer de Sepolia"
            href={EXPLORER_SEPOLIA}
            status={networkStatus}
          />
        </div>
      </div>
    </section>
  )
}
