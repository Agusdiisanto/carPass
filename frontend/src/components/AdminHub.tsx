import { PhoneCompanionCard } from './PhoneCompanionCard'
import {
  ADMIN_SECTIONS,
  type AdminSectionKey,
} from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS } from '../domain/carpass/roles'
import { shortAddress } from '../hooks/useWallet'

type AdminHubProps = {
  address: string
  wrongNetwork: boolean
  onOpen: (key: AdminSectionKey) => void
  onReceiveFromPhone: () => void
}

function StatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3 20 7v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4Z" />
    </svg>
  )
}

export function AdminHub({ address, wrongNetwork, onOpen, onReceiveFromPhone }: AdminHubProps) {
  const coreSections = ADMIN_SECTIONS.filter((section) => section.key !== 'hub' && section.group === 'core')
  const operativeSections = ADMIN_SECTIONS.filter((section) => section.group === 'operative')

  return (
    <div className="admin-hub">
      <section className="admin-hub__stats" aria-label="Estado del panel">
        <div className="admin-hub__stat">
          <StatIcon />
          <div>
            <p className="admin-hub__stat-label">Wallet admin</p>
            <p className="admin-hub__stat-value">{shortAddress(address)}</p>
          </div>
        </div>
        <div className="admin-hub__stat">
          <span className={`admin-hub__network ${wrongNetwork ? 'admin-hub__network--warn' : ''}`} aria-hidden />
          <div>
            <p className="admin-hub__stat-label">Red</p>
            <p className="admin-hub__stat-value">{wrongNetwork ? 'Incorrecta' : 'Sepolia'}</p>
          </div>
        </div>
        <div className="admin-hub__stat admin-hub__stat--actions">
          <p className="admin-hub__stat-label">Acceso rápido</p>
          <div className="admin-hub__quick">
            <button type="button" className="admin-hub__quick-btn" onClick={() => onOpen('vehiculos')}>
              Alta VIN
            </button>
            <button type="button" className="admin-hub__quick-btn" onClick={() => onOpen('roles')}>
              Roles
            </button>
            <button type="button" className="admin-hub__quick-btn" onClick={() => onOpen('taller')}>
              Taller
            </button>
          </div>
        </div>
      </section>

      <section className="admin-hub__intro">
        <h3 className="admin-hub__title">Centro de administración</h3>
        <p className="admin-hub__text">
          Gestioná el ecosistema CarPass, asigná permisos y probá cada vista operativa sin salir del panel.
        </p>
      </section>

      {!wrongNetwork ? (
        <PhoneCompanionCard
          onReceiveFromPhone={onReceiveFromPhone}
          operative
          walletAddress={address}
        />
      ) : null}

      <div className="admin-hub__group">
        <p className="admin-hub__group-label">Gestión central</p>
        <div className="admin-hub__grid">
          {coreSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="admin-hub__card admin-hub__card--core"
              onClick={() => onOpen(section.key)}
            >
              <span className="admin-hub__card-head">
                <span className="admin-hub__card-title">{section.label}</span>
                <span className="admin-hub__card-cta">Entrar</span>
              </span>
              <span className="admin-hub__card-desc">{section.description}</span>
              {section.capabilities ? (
                <span className="admin-hub__tags">
                  {section.capabilities.map((cap) => (
                    <span className="admin-hub__tag" key={cap}>{cap}</span>
                  ))}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-hub__group">
        <p className="admin-hub__group-label">Vistas operativas</p>
        <div className="admin-hub__grid admin-hub__grid--operative">
          {operativeSections.map((section) => {
            const roleClass = section.accentClass ?? (section.roleClass ? ROLE_BADGE_CLASS[section.roleClass] : 'admin')
            return (
              <button
                key={section.key}
                type="button"
                className={`admin-hub__card admin-hub__card--${roleClass}`}
                onClick={() => onOpen(section.key)}
              >
                <span className="admin-hub__card-head">
                  <span className={`admin-hub__pill admin-hub__pill--${roleClass}`}>{section.shortLabel}</span>
                  <span className="admin-hub__card-cta">Abrir vista</span>
                </span>
                <span className="admin-hub__card-title">{section.label}</span>
                <span className="admin-hub__card-desc">{section.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
