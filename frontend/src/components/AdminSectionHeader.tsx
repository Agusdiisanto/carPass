import {
  getAdminPathLabel,
  getAdminSection,
  isOperativeRoleSection,
  isOwnerGarageSection,
  type AdminOperativeSectionKey,
  type AdminPath,
  type AdminSectionKey,
} from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS, ROLE_LABELS } from '../domain/carpass/roles'

type AdminSectionHeaderProps = {
  path: AdminPath
  sectionKey: AdminSectionKey
  onBack: () => void
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function AdminSectionHeader({ path, sectionKey, onBack }: AdminSectionHeaderProps) {
  const section = getAdminSection(sectionKey)
  const roleClass = section.accentClass ?? (section.roleClass ? ROLE_BADGE_CLASS[section.roleClass] : 'admin')
  const previewRole = section.roleClass ? ROLE_LABELS[section.roleClass] : null
  const pathLabel = getAdminPathLabel(path)
  const isGarage = isOwnerGarageSection(sectionKey)

  const sectionPill =
    path === 'manage'
      ? 'Gestión'
      : isGarage
        ? 'Tu garaje'
        : sectionKey === 'inicio'
          ? 'Inicio'
          : 'Flujo operativo'

  return (
    <header className={`admin-section-header admin-section-header--${roleClass}`}>
      <nav className="admin-breadcrumb" aria-label="Ubicación en el panel">
        <button type="button" className="admin-breadcrumb__link" onClick={onBack}>
          {pathLabel}
        </button>
        <ChevronIcon />
        <span className="admin-breadcrumb__current">{section.label}</span>
      </nav>

      <div className="admin-section-header__row">
        <div className="admin-section-header__copy">
          <div className="admin-section-header__badges">
            <span className={`admin-section-header__pill admin-section-header__pill--${path === 'manage' ? 'admin' : roleClass}`}>
              {sectionPill}
            </span>
            {previewRole ? (
              <span className={`admin-section-header__pill admin-section-header__pill--ghost admin-section-header__pill--${roleClass}`}>
                Rol: {previewRole}
              </span>
            ) : null}
          </div>
          <h3 className="admin-section-header__title">{section.label}</h3>
          <p className="admin-section-header__desc">{section.description}</p>
        </div>
      </div>

      {path === 'operate' && isGarage ? (
        <p className="admin-section-header__note" role="note">
          Acciones de propietario NFT: consultá pasaportes y transferí dominio. No requiere rol operativo on-chain.
        </p>
      ) : null}

      {path === 'operate' && isOperativeRoleSection(sectionKey as AdminOperativeSectionKey) ? (
        <p className="admin-section-header__note" role="note">
          Estás en el flujo operativo completo de este rol. Si la wallet admin no tiene el permiso on-chain, asignalo
          desde Administración → Roles.
        </p>
      ) : null}
    </header>
  )
}
