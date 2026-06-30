import { useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { AdminHub } from '../components/AdminHub'
import { AdminSectionHeader } from '../components/AdminSectionHeader'
import { OperativeShell } from '../components/OperativeShell'
import { VinQrScanner } from '../components/VinQrScanner'
import {
  getAdminSection,
  readAdminSection,
  saveAdminSection,
  type AdminSectionKey,
} from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS } from '../domain/carpass/roles'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'
import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVehicleInfo, isValidVin, isValidWalletAddress } from '../domain/carpass/validators'
import { setPendingOperativeVin } from '../lib/operativeVinBridge'
import { AseguradoraView } from './AseguradoraView'
import { InspectorVTVView } from './InspectorVTVView'
import { PropietarioView } from './PropietarioView'
import { RegistradorView } from './RegistradorView'
import { TallerView } from './TallerView'

const ROLES = [
  { label: 'Administrador', fn: 'DEFAULT_ADMIN_ROLE', desc: 'Control total del contrato' },
  { label: 'Concesionaria', fn: 'REGISTRADOR_ROLE', desc: 'Alta de vehículos' },
  { label: 'Taller mecánico', fn: 'MECANICO_ROLE', desc: 'Services y kilometraje' },
  { label: 'Aseguradora', fn: 'ASEGURADORA_ROLE', desc: 'Siniestros' },
  { label: 'Inspector VTV', fn: 'INSPECTOR_VTV_ROLE', desc: 'Inspecciones técnicas' },
]

export function AdminView({ address, wrongNetwork = false }: { address: string; wrongNetwork?: boolean }) {
  const { busy, message, registrarVehiculo, grantRole, revokeRole } = useCarPass()
  const [activeSection, setActiveSection] = useState<AdminSectionKey>(readAdminSection)
  const [qrReceiveOpen, setQrReceiveOpen] = useState(false)
  const [receivedVin, setReceivedVin] = useState('')

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

  const sectionMeta = getAdminSection(activeSection)
  const sectionAccent = sectionMeta.accentClass ?? (sectionMeta.roleClass ? ROLE_BADGE_CLASS[sectionMeta.roleClass] : 'admin')
  const isOperativePreview = !['hub', 'vehiculos', 'roles'].includes(activeSection)
  const showRoleNote = isOperativePreview && activeSection !== 'propietario'

  function openSection(key: AdminSectionKey) {
    setActiveSection(key)
    saveAdminSection(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleQrFromPhone(detectedVin: string) {
    setReceivedVin(detectedVin)
    setPendingOperativeVin(detectedVin)
    setQrReceiveOpen(false)
  }

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

  function renderSectionContent() {
    if (activeSection === 'hub') {
      return (
        <AdminHub
          address={address}
          wrongNetwork={wrongNetwork}
          onOpen={openSection}
          onReceiveFromPhone={() => setQrReceiveOpen(true)}
        />
      )
    }

    if (activeSection === 'propietario') {
      return <PropietarioView address={address} wrongNetwork={wrongNetwork} embedded />
    }
    if (activeSection === 'registrador') {
      return <RegistradorView address={address} wrongNetwork={wrongNetwork} embedded />
    }
    if (activeSection === 'taller') {
      return <TallerView address={address} wrongNetwork={wrongNetwork} embedded />
    }
    if (activeSection === 'aseguradora') {
      return <AseguradoraView address={address} wrongNetwork={wrongNetwork} embedded />
    }
    if (activeSection === 'inspector') {
      return <InspectorVTVView address={address} wrongNetwork={wrongNetwork} embedded />
    }

    if (activeSection === 'vehiculos') {
      return (
        <div className="panels-grid single">
          <section className="panel panel--admin-form">
            <div className="panel-step">
              <span className="panel-step__num">1</span>
              <div>
                <h3>Registrar vehículo</h3>
                <p className="panel-desc">Emití el pasaporte digital vinculado al VIN en Sepolia con 0 km iniciales.</p>
              </div>
            </div>

            <label className="field">
              VIN <span className="field-hint">17 caracteres</span>
              <input maxLength={17} value={vin} onChange={(e) => setVin(normalizeVin(e.target.value))} />
              {vin.length > 0 ? (
                <span className={`vin-count ${isValidVin(vin) ? 'ok' : 'warn'}`}>{vin.length}/17</span>
              ) : null}
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
            {!propietarioValido ? <p className="error-msg">Dirección inválida</p> : null}

            <button
              className="btn-primary full-width"
              disabled={!vehicleFormValido || Boolean(busy)}
              onClick={handleRegistrar}
            >
              {busy === 'Registrando vehiculo' ? 'Registrando...' : 'Registrar vehículo'}
            </button>
          </section>
        </div>
      )
    }

    return (
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
    )
  }

  return (
    <OperativeShell
      role="admin"
      title="Panel de administración"
      description="Gestioná vehículos, permisos y todas las operaciones del pasaporte digital."
      address={address}
      wrongNetwork={wrongNetwork}
      compact={activeSection !== 'hub'}
    >
      <div className="admin-layout">
        <AdminNav active={activeSection} onChange={openSection} />

        <div className={`admin-layout__main admin-layout__main--${sectionAccent}`}>
          {activeSection !== 'hub' ? (
            <AdminSectionHeader
              sectionKey={activeSection}
              onBack={() => openSection('hub')}
              showPreviewNote={showRoleNote}
            />
          ) : null}

          <div className="admin-layout__content">
            {receivedVin && isOperativePreview ? (
              <div className="admin-vin-received" role="status">
                <p>
                  VIN recibido del celular: <code>{receivedVin}</code> — precargado en el identificador.
                </p>
                <button type="button" className="admin-vin-received__clear" onClick={() => setReceivedVin('')}>
                  Descartar
                </button>
              </div>
            ) : null}
            {renderSectionContent()}
          </div>

          {message && !['registrador', 'taller', 'aseguradora', 'inspector', 'propietario'].includes(activeSection)
            ? <div className="status-bar">{message}</div>
            : null}
        </div>
      </div>

      <VinQrScanner
        open={qrReceiveOpen}
        onClose={() => setQrReceiveOpen(false)}
        onDetected={handleQrFromPhone}
        receiveMode
      />
    </OperativeShell>
  )
}
