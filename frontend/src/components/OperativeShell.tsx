import type { ReactNode } from 'react'
import {
  ROLE_BADGE_CLASS,
  ROLE_CAPABILITIES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type OperativeRole,
} from '../domain/carpass/roles'
import { shortAddress } from '../hooks/useWallet'

type OperativeShellProps = {
  role: OperativeRole
  title: string
  description?: string
  address: string
  wrongNetwork?: boolean
  children: ReactNode
  footer?: ReactNode
}

export function OperativeShell({
  role,
  title,
  description,
  address,
  wrongNetwork = false,
  children,
  footer,
}: OperativeShellProps) {
  const badgeClass = ROLE_BADGE_CLASS[role]
  const copy = description ?? ROLE_DESCRIPTIONS[role]
  const capabilities = ROLE_CAPABILITIES[role]

  return (
    <div className="view-container">
      <header className={`op-shell op-shell--${badgeClass}`}>
        <div className="op-shell__row">
          <span className={`role-badge ${badgeClass}`}>{ROLE_LABELS[role]}</span>
          <span className="op-shell__session">
            <span className="op-shell__live-dot" aria-hidden />
            Sesión activa · {shortAddress(address)}
          </span>
        </div>

        {wrongNetwork ? (
          <p className="op-shell__warn">Red incorrecta — cambiá a Sepolia en MetaMask para operar.</p>
        ) : null}

        <h2 className="op-shell__title">{title}</h2>
        <p className="op-shell__desc">{copy}</p>

        <ul className="op-shell__caps" aria-label="Capacidades del rol">
          {capabilities.map((cap) => (
            <li key={cap}>{cap}</li>
          ))}
        </ul>
      </header>

      {children}
      {footer}
    </div>
  )
}
