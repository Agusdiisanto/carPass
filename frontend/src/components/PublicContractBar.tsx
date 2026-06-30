import { useState } from 'react'
import { CARPASS_DEPLOYMENT } from '../contracts/carpassDeployment'
import { CONTRACT_ADDRESS, hasContractAddress } from '../hooks/useCarPass'
import { expectedChainId, shortAddress } from '../hooks/useWallet'

const EXPLORER = 'https://sepolia.etherscan.io/address/'

type PublicContractBarProps = {
  connected: boolean
}

function ShieldLinkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function CopyIconButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      className={`contract-trust__icon-action ${copied ? 'contract-trust__icon-action--ok' : ''}`}
      onClick={() => void copy()}
      title={copied ? 'Copiado' : 'Copiar address'}
      aria-label={copied ? 'Address copiado' : 'Copiar address del contrato'}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

export function PublicContractBar({ connected }: PublicContractBarProps) {
  if (!hasContractAddress) {
    return (
      <aside className="contract-trust contract-trust--warn" aria-label="Contrato no configurado">
        <p className="contract-trust__warn-text">
          Contrato no configurado. Define <code>VITE_CARPASS_CONTRACT_ADDRESS</code> para consultar on-chain.
        </p>
      </aside>
    )
  }

  return (
    <aside className="contract-trust" aria-label="Contrato verificado en Sepolia">
      <div className="contract-trust__shine" aria-hidden />

      <div className="contract-trust__header">
        <div className="contract-trust__brand">
          <span className="contract-trust__icon">
            <ShieldLinkIcon />
          </span>
          <div>
            <p className="contract-trust__eyebrow">Fuente verificable</p>
            <h3 className="contract-trust__title">CarPass · {CARPASS_DEPLOYMENT.network}</h3>
          </div>
        </div>
        <span className={`contract-trust__live ${connected ? 'contract-trust__live--on' : ''}`}>
          <span className="contract-trust__live-dot" aria-hidden />
          {connected ? 'Wallet conectada' : 'Lectura en vivo'}
        </span>
      </div>

      <div className="contract-trust__address-row">
        <div className="contract-trust__address-wrap">
          <span className="contract-trust__address-label">Address del contrato</span>
          <code className="contract-trust__address" title={CONTRACT_ADDRESS}>
            {shortAddress(CONTRACT_ADDRESS)}
          </code>
        </div>
        <div className="contract-trust__toolbar">
          <a
            className="contract-trust__icon-action contract-trust__icon-action--accent"
            href={`${EXPLORER}${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            title="Ver en Etherscan"
            aria-label="Ver contrato en Etherscan"
          >
            <ExternalIcon />
          </a>
          <CopyIconButton value={CONTRACT_ADDRESS} />
        </div>
      </div>

      <ul className="contract-trust__facts">
        <li className="contract-trust__fact contract-trust__fact--ok">
          <strong>Lectura pública</strong>
          <span>Sin wallet para consultar VIN y sello</span>
        </li>
        <li className="contract-trust__fact">
          <strong>ERC-721</strong>
          <span>Un token por vehículo · chain {expectedChainId}</span>
        </li>
        <li className={`contract-trust__fact ${connected ? 'contract-trust__fact--accent' : ''}`}>
          <strong>{connected ? 'Modo operativo' : 'Solo consulta'}</strong>
          <span>
            {connected
              ? 'Podés firmar transacciones con tu wallet'
              : 'Conectá MetaMask en el header para operar'}
          </span>
        </li>
      </ul>
    </aside>
  )
}
