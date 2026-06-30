import { ROLE_CAPABILITIES, ROLE_LABELS } from '../domain/carpass/roles'
import { shortAddress } from '../hooks/useWallet'

const ROLES_DESC = [
  { key: 'admin' as const, desc: 'Registra vehículos y gestiona roles del sistema' },
  { key: 'registrador' as const, desc: 'Da el alta de vehículos con 0 km iniciales' },
  { key: 'mecanico' as const, desc: 'Carga el historial de services y kilometraje' },
  { key: 'aseguradora' as const, desc: 'Declara siniestros y daños' },
  { key: 'inspector' as const, desc: 'Certifica revisiones técnicas vehiculares' },
]

export function NoRoleView({ address }: { address: string }) {
  return (
    <div className="view-container centered">
      <div className="norole-card">
        <div className="norole-hero">
          <div className="norole-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div>
            <p className="norole-eyebrow">Acceso restringido</p>
            <h2>Sin rol operativo</h2>
          </div>
        </div>

        <p className="norole-lead">
          Tu wallet <code>{shortAddress(address)}</code> está conectada pero no tiene permisos para escribir en CarPass.
        </p>
        <p className="norole-sub">
          Podés seguir consultando VIN y sellos desde <strong>Consulta</strong>. Para operar, pedí al administrador que te asigne un rol.
        </p>

        <div className="norole-status">
          <span className="norole-status__dot" aria-hidden />
          Solo lectura on-chain
        </div>

        <div className="roles-list">
          <p className="roles-title">Roles disponibles en el sistema</p>
          {ROLES_DESC.map((r) => (
            <div className="role-row" key={r.key}>
              <div className="role-row__head">
                <strong>{ROLE_LABELS[r.key]}</strong>
                <span className="role-row__caps">{ROLE_CAPABILITIES[r.key].join(' · ')}</span>
              </div>
              <span>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
