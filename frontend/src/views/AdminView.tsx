import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVehicleInfo, isValidVin, isValidWalletAddress } from '../domain/carpass/validators'
import { shortAddress } from '../hooks/useWallet'
import { OperativeShell } from '../components/OperativeShell'
import { RegistradorView } from './RegistradorView'
import { TallerView } from './TallerView'
import { AseguradoraView } from './AseguradoraView'
import { InspectorVTVView } from './InspectorVTVView'
import { PropietarioView } from './PropietarioView'

const ROLES = [
  { label: 'Administrador', fn: 'DEFAULT_ADMIN_ROLE' },
  { label: 'Concesionaria / Registrador', fn: 'REGISTRADOR_ROLE' },
  { label: 'Taller mecánico', fn: 'MECANICO_ROLE' },
  { label: 'Aseguradora', fn: 'ASEGURADORA_ROLE' },
  { label: 'Inspector VTV', fn: 'INSPECTOR_VTV_ROLE' },
]

const ADMIN_VIEWS = [
  { key: 'admin', label: 'Administracion' },
  { key: 'propietario', label: 'Mis vehículos' },
  { key: 'registrador', label: 'Concesionaria' },
  { key: 'taller', label: 'Taller' },
  { key: 'aseguradora', label: 'Aseguradora' },
  { key: 'inspector', label: 'Inspector VTV' },
] as const

type AdminViewKey = (typeof ADMIN_VIEWS)[number]['key']

export function AdminView({ address, wrongNetwork = false }: { address: string; wrongNetwork?: boolean }) {
  const { busy, message, registrarVehiculo, grantRole, revokeRole } = useCarPass()
  const [activeView, setActiveView] = useState<AdminViewKey>('admin')

  const [vin, setVin] = useState('8AJBA3CD4E1234567')
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)

  const [roleTarget, setRoleTarget] = useState('')
  const [selectedRole, setSelectedRole] = useState(ROLES[0].fn)
  const propietarioValido = !propietario || isValidWalletAddress(propietario)
  const roleTargetValido = isValidWalletAddress(roleTarget)
  const vehicleInfo: VehiculoInfo = { vin, marca, modelo, anio, color }
  const vehicleFormValido = isValidVehicleInfo(vehicleInfo) && propietarioValido

  async function handleRegistrar() {
    await registrarVehiculo(vehicleInfo, propietario || address)
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

  function renderSwitcher() {
    return (
      <div className="admin-view-switcher" aria-label="Vistas disponibles para administrador">
        {ADMIN_VIEWS.map((view) => (
          <button
            className={`admin-view-tab ${activeView === view.key ? 'active' : ''}`}
            key={view.key}
            onClick={() => setActiveView(view.key)}
            type="button"
          >
            {view.label}
          </button>
        ))}
      </div>
    )
  }

  function renderAdminPanel() {
    return (
      <>
        <div className="panels-grid">
          <section className="panel">
            <h3>Registrar vehiculo</h3>
            <p className="panel-desc">Acuña el pasaporte digital vinculado al VIN en Sepolia con 0 km iniciales</p>

            <label className="field">
              VIN <span className="field-hint">17 caracteres</span>
              <input maxLength={17} value={vin} onChange={(e) => setVin(normalizeVin(e.target.value))} />
              {vin.length > 0 && (
                <span className={`vin-count ${isValidVin(vin) ? 'ok' : 'warn'}`}>{vin.length}/17</span>
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
            {!propietarioValido && <p className="error-msg">Direccion invalida</p>}

            <button
              className="btn-primary full-width"
              disabled={!vehicleFormValido || Boolean(busy)}
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
            {roleTarget && !roleTargetValido && <p className="error-msg">Direccion invalida</p>}

            <div className="action-row">
              <button
                className="btn-primary"
                disabled={!roleTargetValido || Boolean(busy)}
                onClick={handleGrant}
              >
                {busy === 'Asignando rol' ? 'Asignando...' : 'Asignar'}
              </button>
              <button
                className="btn-danger"
                disabled={!roleTargetValido || Boolean(busy)}
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
      </>
    )
  }

  function renderRoleView() {
    if (activeView === 'propietario') return <PropietarioView address={address} wrongNetwork={wrongNetwork} />
    if (activeView === 'registrador') return <RegistradorView address={address} wrongNetwork={wrongNetwork} />
    if (activeView === 'taller') return <TallerView address={address} wrongNetwork={wrongNetwork} />
    if (activeView === 'aseguradora') return <AseguradoraView address={address} wrongNetwork={wrongNetwork} />
    if (activeView === 'inspector') return <InspectorVTVView address={address} wrongNetwork={wrongNetwork} />
    return null
  }

  if (activeView !== 'admin') {
    return (
      <>
        <div className="view-container admin-demo-toolbar">
          {renderSwitcher()}
          {activeView !== 'propietario' && (
            <div className="admin-role-note">
              Modo demo de administrador: estás viendo la pantalla real del rol seleccionado. Las escrituras siguen
              requiriendo el rol on-chain correspondiente para esta wallet.
            </div>
          )}
        </div>

        {renderRoleView()}
      </>
    )
  }

  return (
    <OperativeShell
      role="admin"
      title="Panel de administración"
      description="Registrá vehículos, gestioná permisos y alterná entre las vistas operativas."
      address={address}
      wrongNetwork={wrongNetwork}
    >
      {renderSwitcher()}
      {renderAdminPanel()}
    </OperativeShell>
  )
}
