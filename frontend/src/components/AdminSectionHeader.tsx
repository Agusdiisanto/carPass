import { getAdminSection, type AdminSectionKey } from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS, ROLE_LABELS } from '../domain/carpass/roles'

type AdminSectionHeaderProps = {
  sectionKey: AdminSectionKey
  onBack: () => void
  showPreviewNote?: boolean
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function AdminSectionHeader({ sectionKey, onBack, showPreviewNote = false }: AdminSectionHeaderProps) {
  const section = getAdminSection(sectionKey)
  const roleClass = section.accentClass ?? (section.roleClass ? ROLE_BADGE_CLASS[section.roleClass] : 'admin')
  const previewRole = section.roleClass ? ROLE_LABELS[section.roleClass] : null

  return (
    <header className={`admin-section-header admin-section-header--${roleClass}`}>
      <nav className="admin-breadcrumb" aria-label="Ubicación en el panel">
        <button type="button" className="admin-breadcrumb__link" onClick={onBack}>
          Inicio
        </button>
        <ChevronIcon />
        <span className="admin-breadcrumb__current">{section.label}</span>
      </nav>

      <div className="admin-section-header__row">
        <div className="admin-section-header__copy">
          <div className="admin-section-header__badges">
            {section.group === 'operative' ? (
              <span className={`admin-section-header__pill admin-section-header__pill--${roleClass}`}>
                Vista operativa
              </span>
            ) : (
              <span className="admin-section-header__pill admin-section-header__pill--admin">
                Administración
              </span>
            )}
            {previewRole ? (
              <span className={`admin-section-header__pill admin-section-header__pill--ghost admin-section-header__pill--${roleClass}`}>
                Rol real: {previewRole}
              </span>
            ) : null}
          </div>
          <h3 className="admin-section-header__title">{section.label}</h3>
          <p className="admin-section-header__desc">{section.description}</p>
        </div>
      </div>

      {showPreviewNote ? (
        <p className="admin-section-header__note" role="note">
          Estás previsualizando la interfaz operativa. Las transacciones on-chain exigen el rol correspondiente en tu wallet.
        </p>
      ) : null}
    </header>
  )
}
