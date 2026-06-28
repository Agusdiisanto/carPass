import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'

const ROLES = [
  { label: 'Concesionaria / Registrador', fn: 'REGISTRADOR_ROLE' },
  { label: 'Taller mecánico', fn: 'MECANICO_ROLE' },
  { label: 'Aseguradora', fn: 'ASEGURADORA_ROLE' },
  { label: 'Inspector VTV', fn: 'INSPECTOR_VTV_ROLE' },
]

export function AdminView({ address }: { address: string }) {
  const { busy, message, registrarVehiculo, grantRole, revokeRole } = useCarPass()

  const [vin, setVin] = useState('8AJBA3CD4E1234567')
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)

  const [roleTarget, setRoleTarget] = useState('')
  const [selectedRole, setSelectedRole] = useState(ROLES[0].fn)

  async function handleRegistrar() {
    const info: VehiculoInfo = { vin, marca, modelo, anio, color }
    await registrarVehiculo(info, propietario || address)
  }

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
    <div className="view-container">
      <div className="view-header">
        <div className="role-badge admin">Administrador</div>
        <h2>Panel de administracion</h2>
        <p className="view-desc">Registrá vehículos y gestioná los permisos del sistema.</p>
      </div>

      <div className="panels-grid">
        <section className="panel">
          <h3>Registrar vehiculo</h3>
          <p className="panel-desc">Acuña el pasaporte digital vinculado al VIN en Sepolia</p>

          <label className="field">
            VIN <span className="field-hint">17 caracteres</span>
            <input maxLength={17} value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} />
            {vin.length > 0 && (
              <span className={`vin-count ${vin.length === 17 ? 'ok' : 'warn'}`}>{vin.length}/17</span>
            )}
          </label>

          <div className="two-col">
            <label className="field">Marca<input value={marca} onChange={(e) => setMarca(e.target.value)} /></label>
            <label className="field">Modelo<input value={modelo} onChange={(e) => setModelo(e.target.value)} /></label>
          </div>

          <div className="two-col">
            <label className="field">
              Año
              <input max="2099" min="1900" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            </label>
            <label className="field">Color<input value={color} onChange={(e) => setColor(e.target.value)} /></label>
          </div>

          <label className="field">
            Propietario
            <input placeholder={address} value={propietario} onChange={(e) => setPropietario(e.target.value)} />
          </label>

          <button
            className="btn-primary full-width"
            disabled={vin.length !== 17 || Boolean(busy)}
            onClick={handleRegistrar}
          >
            {busy === 'Registrando vehiculo' ? 'Registrando...' : 'Registrar vehiculo'}
          </button>
        </section>

        <section className="panel">
          <h3>Gestión de roles</h3>
          <p className="panel-desc">Asigná o revocá permisos a wallets del sistema</p>

          <label className="field">
            Rol
            <select className="select-input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.fn} value={r.fn}>{r.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Wallet
            <input
              placeholder="Dirección 0x..."
              value={roleTarget}
              onChange={(e) => setRoleTarget(e.target.value)}
            />
          </label>

          <div className="action-row">
            <button
              className="btn-primary"
              disabled={!roleTarget || Boolean(busy)}
              onClick={handleGrant}
            >
              {busy === 'Asignando rol' ? 'Asignando...' : 'Asignar'}
            </button>
            <button
              className="btn-danger"
              disabled={!roleTarget || Boolean(busy)}
              onClick={handleRevoke}
            >
              {busy === 'Revocando rol' ? 'Revocando...' : 'Revocar'}
            </button>
          </div>

          <div className="wallet-info">
            <span>Tu wallet</span>
            <code>{shortAddress(address)}</code>
          </div>
        </section>
      </div>

      {message && <div className="status-bar">{message}</div>}
    </div>
  )
}
