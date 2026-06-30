import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'
import { isValidWalletAddress } from '../domain/carpass/validators'

const ROLES = [
  { label: 'Administrador', fn: 'DEFAULT_ADMIN_ROLE', desc: 'Control total del contrato' },
  { label: 'Concesionaria', fn: 'REGISTRADOR_ROLE', desc: 'Alta de vehículos' },
  { label: 'Taller mecánico', fn: 'MECANICO_ROLE', desc: 'Services y kilometraje' },
  { label: 'Aseguradora', fn: 'ASEGURADORA_ROLE', desc: 'Siniestros' },
  { label: 'Inspector VTV', fn: 'INSPECTOR_VTV_ROLE', desc: 'Inspecciones técnicas' },
]

type AdminManageRolesPanelProps = {
  address: string
}

export function AdminManageRolesPanel({ address }: AdminManageRolesPanelProps) {
  const { busy, message, grantRole, revokeRole } = useCarPass()
  const [roleTarget, setRoleTarget] = useState('')
  const [selectedRole, setSelectedRole] = useState(ROLES[0].fn)
  const roleTargetValido = isValidWalletAddress(roleTarget)

  async function handleGrant() {
    if (!roleTarget) return
    await grantRole(selectedRole, roleTarget)
    setRoleTarget('')
  }

  async function handleRevoke() {
    if (!roleTarget) return
    await revokeRole(selectedRole, roleTarget)
    setRoleTarget('')
  }

  return (
    <>
      <div className="panels-grid admin-roles-layout">
        <section className="panel panel--admin-form">
          <div className="panel-step">
            <span className="panel-step__num">1</span>
            <div>
              <h3>Gestión de roles</h3>
              <p className="panel-desc">Asigná o revocá permisos operativos a wallets del ecosistema.</p>
            </div>
          </div>

          <div className="admin-role-picker" role="listbox" aria-label="Seleccionar rol">
            {ROLES.map((role) => (
              <button
                key={role.fn}
                type="button"
                className={`admin-role-picker__item ${selectedRole === role.fn ? 'active' : ''}`}
                onClick={() => setSelectedRole(role.fn)}
                aria-selected={selectedRole === role.fn}
              >
                <span className="admin-role-picker__label">{role.label}</span>
                <span className="admin-role-picker__desc">{role.desc}</span>
              </button>
            ))}
          </div>

          <label className="field">
            Wallet destino
            <input placeholder="0x..." value={roleTarget} onChange={(e) => setRoleTarget(e.target.value)} />
          </label>
          {roleTarget && !roleTargetValido ? <p className="error-msg">Dirección inválida</p> : null}

          <div className="action-row">
            <button className="btn-primary" disabled={!roleTargetValido || Boolean(busy)} onClick={handleGrant}>
              {busy === 'Asignando rol' ? 'Asignando...' : 'Asignar rol'}
            </button>
            <button className="btn-danger" disabled={!roleTargetValido || Boolean(busy)} onClick={handleRevoke}>
              {busy === 'Revocando rol' ? 'Revocando...' : 'Revocar rol'}
            </button>
          </div>

          <div className="wallet-info">
            <span>Tu wallet admin</span>
            <code>{shortAddress(address)}</code>
          </div>
        </section>
      </div>
      {message ? <div className="status-bar">{message}</div> : null}
    </>
  )
}
