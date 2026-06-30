import { ADMIN_PATH_LABELS, type AdminPath } from '../domain/carpass/adminSections'
import { shortAddress } from '../hooks/useWallet'

type AdminPathSwitcherProps = {
  path: AdminPath
  address: string
  wrongNetwork: boolean
  onChange: (path: AdminPath) => void
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3 20 7v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4Z" />
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

export function AdminPathSwitcher({ path, address, wrongNetwork, onChange }: AdminPathSwitcherProps) {
  return (
    <section className="admin-path-switcher" aria-label="Modo del panel admin">
      <div className="admin-path-switcher__copy">
        <p className="admin-path-switcher__eyebrow">Panel admin</p>
        <p className="admin-path-switcher__meta">
          {shortAddress(address)} · {wrongNetwork ? 'Red incorrecta' : 'Sepolia'}
        </p>
      </div>

      <div className="admin-path-switcher__tabs" role="tablist" aria-label="Elegir flujo">
        <button
          type="button"
          role="tab"
          aria-selected={path === 'manage'}
          className={`admin-path-switcher__tab ${path === 'manage' ? 'active' : ''}`}
          onClick={() => onChange('manage')}
        >
          <ShieldIcon />
          <span>
            <strong>{ADMIN_PATH_LABELS.manage.label}</strong>
            <small>{ADMIN_PATH_LABELS.manage.tabSubtitle}</small>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={path === 'operate'}
          className={`admin-path-switcher__tab ${path === 'operate' ? 'active' : ''}`}
          onClick={() => onChange('operate')}
        >
          <WrenchIcon />
          <span>
            <strong>{ADMIN_PATH_LABELS.operate.label}</strong>
            <small>{ADMIN_PATH_LABELS.operate.tabSubtitle}</small>
          </span>
        </button>
      </div>
    </section>
  )
}
