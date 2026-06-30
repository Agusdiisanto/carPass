import type { ReactNode } from 'react'
import type { Role } from '../hooks/useCarPass'
import { ROLE_BADGE_CLASS, ROLE_LABELS } from '../domain/carpass/roles'

export type AppNavSection = 'consulta' | 'mis-autos' | 'panel'

type AppNavRailProps = {
  active: AppNavSection
  role: Role | null
  walletLinked?: boolean
  detecting?: boolean
  contextVin?: string | null
  onConsulta: () => void
  onMisAutos?: () => void
  onPanel?: () => void
  onViewContextVin?: (vin: string) => void
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M5 17h14" />
      <path d="M6 11h12l1-4H5z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function panelLabel(role: Role | null): string {
  if (role === 'admin') return 'Administrar'
  if (role === 'registrador') return 'Registro'
  if (role === 'mecanico') return 'Taller'
  if (role === 'aseguradora') return 'Siniestros'
  if (role === 'inspector') return 'VTV'
  if (role && role !== 'none') return ROLE_LABELS[role]
  return 'Operar'
}

type NavItemProps = {
  active: boolean
  icon: ReactNode
  label: string
  roleClass?: string
  onClick?: () => void
}

function NavItem({ active, icon, label, roleClass, onClick }: NavItemProps) {
  const className = [
    'app-nav-rail__item',
    active ? 'active' : '',
    roleClass ? `app-nav-rail__item--role ${roleClass}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (active) {
    return (
      <span className={className} aria-current="page">
        <span className="app-nav-rail__icon" aria-hidden>{icon}</span>
        <span className="app-nav-rail__label">{label}</span>
      </span>
    )
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      <span className="app-nav-rail__icon" aria-hidden>{icon}</span>
      <span className="app-nav-rail__label">{label}</span>
    </button>
  )
}

export function AppNavRail({
  active,
  role,
  walletLinked = false,
  detecting = false,
  contextVin,
  onConsulta,
  onMisAutos,
  onPanel,
  onViewContextVin,
}: AppNavRailProps) {
  if (!walletLinked) return null

  const showPanel = Boolean(role && role !== 'none' && onPanel)
  const roleClass = role && role !== 'none' ? ROLE_BADGE_CLASS[role] : undefined
  const showContext = Boolean(contextVin && (active === 'panel' || active === 'mis-autos'))

  return (
    <div className="app-nav-rail-wrap">
      <nav className="app-nav-rail" aria-label="Secciones de CarPass">
        <NavItem
          active={active === 'consulta'}
          icon={<SearchIcon />}
          label="Consulta"
          onClick={onConsulta}
        />
        <NavItem
          active={active === 'mis-autos'}
          icon={<CarIcon />}
          label="Mis vehículos"
          onClick={onMisAutos}
        />
        {showPanel ? (
          <NavItem
            active={active === 'panel'}
            icon={<PanelIcon />}
            label={detecting ? 'Panel…' : panelLabel(role)}
            roleClass={roleClass}
            onClick={onPanel}
          />
        ) : null}
      </nav>

      {showContext && contextVin ? (
        <div className="app-nav-rail__context">
          <span className="app-nav-rail__context-label">VIN activo</span>
          <code className="app-nav-rail__context-vin">{contextVin}</code>
          {onViewContextVin ? (
            <button
              type="button"
              className="app-nav-rail__context-link"
              onClick={() => onViewContextVin(contextVin)}
            >
              Ver pasaporte
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
