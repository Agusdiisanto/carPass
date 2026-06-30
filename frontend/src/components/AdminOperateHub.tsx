import { PhoneCompanionCard } from './PhoneCompanionCard'
import {
  ADMIN_OPERATIVE_SECTIONS,
  type AdminOperativeSectionKey,
} from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS } from '../domain/carpass/roles'

type AdminOperateHubProps = {
  wrongNetwork: boolean
  walletAddress: string
  onOpen: (key: AdminOperativeSectionKey) => void
  onReceiveFromPhone: () => void
}

export function AdminOperateHub({
  wrongNetwork,
  walletAddress,
  onOpen,
  onReceiveFromPhone,
}: AdminOperateHubProps) {
  const roleSections = ADMIN_OPERATIVE_SECTIONS.filter((section) => section.key !== 'inicio')

  return (
    <div className="admin-hub admin-hub--operate">
      <section className="admin-hub__intro admin-hub__intro--operate">
        <h3 className="admin-hub__title">Operar por rol</h3>
        <p className="admin-hub__text">
          Elegí el rol del ecosistema. Cada opción abre el mismo flujo que vería esa wallet en producción.
          Si la transacción falla por permisos, asigná el rol desde Administración.
        </p>
      </section>

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
          {roleSections.map((section) => {
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
