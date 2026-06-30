import { useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { OperativeShell } from '../components/OperativeShell'
import {
  ADMIN_SECTIONS,
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
import { AseguradoraView } from './AseguradoraView'
import { InspectorVTVView } from './InspectorVTVView'
import { PropietarioView } from './PropietarioView'
import { RegistradorView } from './RegistradorView'
import { TallerView } from './TallerView'

const ROLES = [
  { label: 'Administrador', fn: 'DEFAULT_ADMIN_ROLE' },
  { label: 'Concesionaria / Registrador', fn: 'REGISTRADOR_ROLE' },
  { label: 'Taller mecánico', fn: 'MECANICO_ROLE' },
  { label: 'Aseguradora', fn: 'ASEGURADORA_ROLE' },
  { label: 'Inspector VTV', fn: 'INSPECTOR_VTV_ROLE' },
]

function AdminHub({ onOpen }: { onOpen: (key: AdminSectionKey) => void }) {
  const coreSections = ADMIN_SECTIONS.filter((section) => section.key !== 'hub' && section.group === 'core')
  const operativeSections = ADMIN_SECTIONS.filter((section) => section.group === 'operative')

  return (
    <div className="admin-hub">
      <section className="admin-hub__intro">
        <h3 className="admin-hub__title">Centro de administración</h3>
        <p className="admin-hub__text">
          Elegí un apartado para gestionar vehículos, permisos o revisar las vistas operativas del ecosistema CarPass.
        </p>
      </section>

      <div className="admin-hub__group">
        <p className="admin-hub__group-label">Gestión central</p>
        <div className="admin-hub__grid">
          {coreSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="admin-hub__card admin-hub__card--core"
              onClick={() => onOpen(section.key)}
            >
              <span className="admin-hub__card-head">
                <span className="admin-hub__card-title">{section.label}</span>
                <span className="admin-hub__card-cta">Entrar</span>
              </span>
              <span className="admin-hub__card-desc">{section.description}</span>
              {section.capabilities ? (
                <span className="admin-hub__tags">
                  {section.capabilities.map((cap) => (
                    <span className="admin-hub__tag" key={cap}>{cap}</span>
                  ))}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-hub__group">
        <p className="admin-hub__group-label">Vistas operativas</p>
        <div className="admin-hub__grid admin-hub__grid--operative">
          {operativeSections.map((section) => {
            const roleClass = section.accentClass ?? (section.roleClass ? ROLE_BADGE_CLASS[section.roleClass] : 'admin')
            return (
              <button
                key={section.key}
                type="button"
                className={`admin-hub__card admin-hub__card--${roleClass}`}
                onClick={() => onOpen(section.key)}
              >
                <span className="admin-hub__card-head">
                  <span className={`admin-hub__pill admin-hub__pill--${roleClass}`}>{section.shortLabel}</span>
                  <span className="admin-hub__card-cta">Abrir vista</span>
                </span>
                <span className="admin-hub__card-title">{section.label}</span>
                <span className="admin-hub__card-desc">{section.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AdminSectionHeader({
  sectionKey,
  onBack,
}: {
  sectionKey: AdminSectionKey
  onBack: () => void
}) {
  const section = getAdminSection(sectionKey)
  const roleClass = section.accentClass ?? (section.roleClass ? ROLE_BADGE_CLASS[section.roleClass] : 'admin')

  return (
    <header className={`admin-section-header admin-section-header--${roleClass}`}>
      <button type="button" className="admin-section-header__back" onClick={onBack}>
        ← Volver al inicio
      </button>
      <div className="admin-section-header__copy">
        <h3 className="admin-section-header__title">{section.label}</h3>
        <p className="admin-section-header__desc">{section.description}</p>
      </div>
    </header>
  )
}

export function AdminView({ address, wrongNetwork = false }: { address: string; wrongNetwork?: boolean }) {
  const { busy, message, registrarVehiculo, grantRole, revokeRole } = useCarPass()
  const [activeSection, setActiveSection] = useState<AdminSectionKey>(readAdminSection)

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

  function openSection(key: AdminSectionKey) {
    setActiveSection(key)
    saveAdminSection(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      return <AdminHub onOpen={openSection} />
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
          <section className="panel">
            <h3>Registrar vehículo</h3>
            <p className="panel-desc">Acuñá el pasaporte digital vinculado al VIN en Sepolia con 0 km iniciales.</p>

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
      <div className="panels-grid single">
        <section className="panel">
          <h3>Gestión de roles</h3>
          <p className="panel-desc">Asigná o revocá permisos a wallets del sistema.</p>

          <label className="field">
            Rol
            <select className="select-input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {ROLES.map((role) => (
                <option key={role.fn} value={role.fn}>{role.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Wallet
            <input placeholder="Dirección 0x..." value={roleTarget} onChange={(e) => setRoleTarget(e.target.value)} />
          </label>
          {roleTarget && !roleTargetValido ? <p className="error-msg">Dirección inválida</p> : null}

          <div className="action-row">
            <button className="btn-primary" disabled={!roleTargetValido || Boolean(busy)} onClick={handleGrant}>
              {busy === 'Asignando rol' ? 'Asignando...' : 'Asignar'}
            </button>
            <button className="btn-danger" disabled={!roleTargetValido || Boolean(busy)} onClick={handleRevoke}>
              {busy === 'Revocando rol' ? 'Revocando...' : 'Revocar'}
            </button>
          </div>

          <div className="wallet-info">
            <span>Tu wallet</span>
            <code>{shortAddress(address)}</code>
          </div>
        </section>
      </div>
    )
  }

  const isOperativePreview = !['hub', 'vehiculos', 'roles'].includes(activeSection)
  const showRoleNote = isOperativePreview && activeSection !== 'propietario'

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

        <div className="admin-layout__main">
          {activeSection !== 'hub' ? (
            <AdminSectionHeader sectionKey={activeSection} onBack={() => openSection('hub')} />
          ) : null}

          {showRoleNote ? (
            <div className="admin-role-note">
              Vista operativa en modo administrador. Las escrituras on-chain siguen requiriendo el rol correspondiente.
            </div>
          ) : null}

          {renderSectionContent()}
          {message && !['registrador', 'taller', 'aseguradora', 'inspector', 'propietario'].includes(activeSection)
            ? <div className="status-bar">{message}</div>
            : null}
        </div>
      </div>
    </OperativeShell>
  )
}
