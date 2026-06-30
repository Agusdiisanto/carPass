import { PhoneCompanionCard } from './PhoneCompanionCard'
import {
  ADMIN_OPERATIVE_ROLE_SECTIONS,
  ADMIN_OPERATIVE_SECTIONS,
  ADMIN_PATH_LABELS,
  type AdminOperativeSectionKey,
} from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS } from '../domain/carpass/roles'

type AdminOperateHubProps = {
  wrongNetwork: boolean
  walletAddress: string
  onOpen: (key: AdminOperativeSectionKey) => void
  onReceiveFromPhone: () => void
  onGoToMisAutos?: () => void
}

function GarageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 17h14" />
      <path d="M6 11h12l1-4H5z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </svg>
  )
}

export function AdminOperateHub({
  wrongNetwork,
  walletAddress,
  onOpen,
  onReceiveFromPhone,
  onGoToMisAutos,
}: AdminOperateHubProps) {
  const garageSection = ADMIN_OPERATIVE_SECTIONS.find((section) => section.key === 'propietario')
  const pathMeta = ADMIN_PATH_LABELS.operate

  return (
    <div className="admin-hub admin-hub--operate">
      <section className="admin-hub__intro admin-hub__intro--operate">
        <h3 className="admin-hub__title">{pathMeta.label}</h3>
        <p className="admin-hub__text">
          Gestioná tu flota NFT como propietario o simulá los flujos operativos del ecosistema CarPass.
        </p>
      </section>

      <div className="admin-hub__group">
        <p className="admin-hub__group-label">Tu garaje</p>
        <div className="admin-hub__grid admin-hub__grid--garage">
          {garageSection ? (
            <button
              type="button"
              className="admin-hub__card admin-hub__card--none"
              onClick={() => onOpen('propietario')}
            >
              <span className="admin-hub__card-head">
                <span className="admin-hub__pill admin-hub__pill--none">{garageSection.shortLabel}</span>
                <span className="admin-hub__card-cta">Ver flota</span>
              </span>
              <span className="admin-hub__card-title">{garageSection.label}</span>
              <span className="admin-hub__card-desc">{garageSection.description}</span>
            </button>
          ) : null}

          {onGoToMisAutos ? (
            <button type="button" className="admin-hub__garaje-cta" onClick={onGoToMisAutos}>
              <span className="admin-hub__garaje-icon" aria-hidden>
                <GarageIcon />
              </span>
              <span className="admin-hub__garaje-copy">
                <strong>Abrir garaje en pantalla completa</strong>
                <span>Transferí dominio y consultá pasaportes con la vista dedicada de Mis vehículos.</span>
              </span>
              <span className="admin-hub__garaje-arrow" aria-hidden>→</span>
            </button>
          ) : null}
        </div>
      </div>

      {!wrongNetwork ? (
        <PhoneCompanionCard
          onReceiveFromPhone={onReceiveFromPhone}
          operative
          walletAddress={walletAddress}
        />
      ) : null}

      <div className="admin-hub__group">
        <p className="admin-hub__group-label">Roles operativos</p>
        <div className="admin-hub__grid admin-hub__grid--operative">
          {ADMIN_OPERATIVE_ROLE_SECTIONS.map((section) => {
            const roleClass = section.accentClass ?? (section.roleClass ? ROLE_BADGE_CLASS[section.roleClass] : 'admin')
            return (
              <button
                key={section.key}
                type="button"
                className={`admin-hub__card admin-hub__card--${roleClass}`}
                onClick={() => onOpen(section.key as AdminOperativeSectionKey)}
              >
                <span className="admin-hub__card-head">
                  <span className={`admin-hub__pill admin-hub__pill--${roleClass}`}>{section.shortLabel}</span>
                  <span className="admin-hub__card-cta">Abrir flujo</span>
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
