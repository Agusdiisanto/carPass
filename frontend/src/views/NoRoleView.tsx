import { shortAddress } from '../hooks/useWallet'

const ROLES_DESC = [
  { label: 'Administrador', desc: 'Registra vehículos y gestiona roles del sistema' },
  { label: 'Concesionaria', desc: 'Da el alta de vehículos y declara siniestros' },
  { label: 'Taller', desc: 'Carga el historial de services y kilometraje' },
  { label: 'Aseguradora', desc: 'Declara siniestros y daños' },
  { label: 'Inspector VTV', desc: 'Certifica revisiones técnicas vehiculares' },
]

export function NoRoleView({ address }: { address: string }) {
  return (
    <div className="view-container centered">
      <div className="norole-card">
        <div className="norole-icon">?</div>
        <h2>Sin rol asignado</h2>
        <p>
          Tu wallet <code>{shortAddress(address)}</code> no tiene permisos para operar en CarPass.
        </p>
        <p>Contactá al administrador del sistema para que te asigne el rol correspondiente.</p>

        <div className="roles-list">
          <p className="roles-title">Roles disponibles en el sistema</p>
          {ROLES_DESC.map((r) => (
            <div className="role-row" key={r.label}>
              <strong>{r.label}</strong>
              <span>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
