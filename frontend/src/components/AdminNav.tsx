import type { ReactNode } from 'react'
import {
  ADMIN_SECTIONS,
  type AdminSection,
  type AdminSectionKey,
} from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS } from '../domain/carpass/roles'

type AdminNavProps = {
  active: AdminSectionKey
  onChange: (key: AdminSectionKey) => void
}

function HubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 17h14M5 17a2 2 0 1 0-4 0 2 2 0 0 0 4 0Zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M3 12h18l-2-7H5l-2 7Z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3 20 7v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4Z" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <path d="M3 9 5 3h14l2 6" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 11 11 13 15 9" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

const SECTION_ICONS: Record<AdminSectionKey, () => ReactNode> = {
  hub: HubIcon,
  vehiculos: CarIcon,
  roles: ShieldIcon,
  registrador: StoreIcon,
  taller: WrenchIcon,
  aseguradora: AlertIcon,
  inspector: CheckIcon,
}

function NavItem({
  section,
  active,
  onChange,
  variant,
}: {
  section: AdminSection
  active: boolean
  onChange: (key: AdminSectionKey) => void
  variant: 'sidebar' | 'rail'
}) {
  const Icon = SECTION_ICONS[section.key]
  const roleClass = section.roleClass ? ROLE_BADGE_CLASS[section.roleClass] : 'admin'

  return (
    <button
      type="button"
      className={`admin-nav__item admin-nav__item--${variant} ${active ? 'active' : ''} ${section.roleClass ? `admin-nav__item--${roleClass}` : ''}`}
      onClick={() => onChange(section.key)}
      aria-current={active ? 'page' : undefined}
    >
      <span className="admin-nav__icon" aria-hidden>
        <Icon />
      </span>
      <span className="admin-nav__copy">
        <span className="admin-nav__label">{variant === 'rail' ? section.shortLabel : section.label}</span>
        {variant === 'sidebar' ? (
          <span className="admin-nav__hint">{section.shortLabel}</span>
        ) : null}
      </span>
    </button>
  )
}

function NavGroup({
  title,
  sections,
  active,
  onChange,
  variant,
}: {
  title: string
  sections: AdminSection[]
  active: AdminSectionKey
  onChange: (key: AdminSectionKey) => void
  variant: 'sidebar' | 'rail'
}) {
  return (
    <div className="admin-nav__group">
      <p className="admin-nav__group-title">{title}</p>
      <div className="admin-nav__group-items">
        {sections.map((section) => (
          <NavItem
            key={section.key}
            section={section}
            active={active === section.key}
            onChange={onChange}
            variant={variant}
          />
        ))}
      </div>
    </div>
  )
}

export function AdminNav({ active, onChange }: AdminNavProps) {
  const coreSections = ADMIN_SECTIONS.filter((section) => section.group === 'core')
  const operativeSections = ADMIN_SECTIONS.filter((section) => section.group === 'operative')

  return (
    <>
      <nav className="admin-nav admin-nav--sidebar" aria-label="Secciones de administración">
        <NavGroup title="Administración" sections={coreSections} active={active} onChange={onChange} variant="sidebar" />
        <NavGroup title="Vistas operativas" sections={operativeSections} active={active} onChange={onChange} variant="sidebar" />
      </nav>

      <nav className="admin-nav admin-nav--rail" aria-label="Secciones de administración">
        {ADMIN_SECTIONS.map((section) => (
          <NavItem
            key={section.key}
            section={section}
            active={active === section.key}
            onChange={onChange}
            variant="rail"
          />
        ))}
      </nav>
    </>
  )
}
