import { useState } from 'react'
import { AdminManageContent } from '../components/AdminManageContent'
import { AdminNav } from '../components/AdminNav'
import { AdminOperativeContent } from '../components/AdminOperativeContent'
import { AdminPathSwitcher } from '../components/AdminPathSwitcher'
import { AdminSectionHeader } from '../components/AdminSectionHeader'
import { VinQrScanner } from '../components/VinQrScanner'
import {
  getAdminSection,
  readAdminManageSection,
  readAdminOperativeSection,
  readAdminPath,
  saveAdminManageSection,
  saveAdminOperativeSection,
  saveAdminPath,
  type AdminManageSectionKey,
  type AdminOperativeSectionKey,
  type AdminPath,
} from '../domain/carpass/adminSections'
import { ROLE_BADGE_CLASS } from '../domain/carpass/roles'
import { setPendingOperativeVin } from '../lib/operativeVinBridge'

export function AdminView({
  address,
  wrongNetwork = false,
  onViewPassport,
  onGoToMisAutos,
}: {
  address: string
  wrongNetwork?: boolean
  onViewPassport?: (vin: string) => void
  onGoToMisAutos?: () => void
}) {
  const [path, setPath] = useState<AdminPath>(readAdminPath)
  const [manageSection, setManageSection] = useState<AdminManageSectionKey>(readAdminManageSection)
  const [operativeSection, setOperativeSection] = useState<AdminOperativeSectionKey>(readAdminOperativeSection)
  const [qrReceiveOpen, setQrReceiveOpen] = useState(false)
  const [receivedVin, setReceivedVin] = useState('')

  const activeSection = path === 'manage' ? manageSection : operativeSection
  const sectionMeta = getAdminSection(activeSection)
  const sectionAccent = sectionMeta.accentClass ?? (sectionMeta.roleClass ? ROLE_BADGE_CLASS[sectionMeta.roleClass] : 'admin')
  const showSectionHeader = activeSection !== 'hub' && activeSection !== 'inicio'
  const isOperativeForm =
    path === 'operate' && operativeSection !== 'inicio' && operativeSection !== 'propietario'

  function switchPath(next: AdminPath) {
    setPath(next)
    saveAdminPath(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openManageSection(key: AdminManageSectionKey) {
    setManageSection(key)
    saveAdminManageSection(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openOperativeSection(key: AdminOperativeSectionKey) {
    setOperativeSection(key)
    saveAdminOperativeSection(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    if (path === 'manage') openManageSection('hub')
    else openOperativeSection('inicio')
  }

  function handleQrFromPhone(detectedVin: string) {
    setReceivedVin(detectedVin)
    setPendingOperativeVin(detectedVin)
    setQrReceiveOpen(false)
  }

  return (
    <div className="view-container admin-root">
      <AdminPathSwitcher
        path={path}
        address={address}
        wrongNetwork={wrongNetwork}
        onChange={switchPath}
      />

      <div className="admin-layout">
        <AdminNav
          path={path}
          manageActive={manageSection}
          operativeActive={operativeSection}
          onManageChange={openManageSection}
          onOperativeChange={openOperativeSection}
        />

        <div className={`admin-layout__main admin-layout__main--${sectionAccent} admin-layout__main--path-${path}`}>
          {showSectionHeader ? (
            <AdminSectionHeader path={path} sectionKey={activeSection} onBack={handleBack} />
          ) : null}

          <div className={`admin-layout__content ${isOperativeForm ? 'admin-layout__content--operative-form' : ''}`}>
            {receivedVin && path === 'operate' && operativeSection !== 'inicio' ? (
              <div className="admin-vin-received" role="status">
                <p>
                  VIN recibido del celular: <code>{receivedVin}</code> — precargado en el identificador.
                </p>
                <button type="button" className="admin-vin-received__clear" onClick={() => setReceivedVin('')}>
                  Descartar
                </button>
              </div>
            ) : null}

            {path === 'manage' ? (
              <AdminManageContent
                section={manageSection}
                address={address}
                wrongNetwork={wrongNetwork}
                onOpen={openManageSection}
              />
            ) : (
              <AdminOperativeContent
                section={operativeSection}
                address={address}
                wrongNetwork={wrongNetwork}
                onOpen={openOperativeSection}
                onReceiveFromPhone={() => setQrReceiveOpen(true)}
                onViewPassport={onViewPassport}
                onGoToMisAutos={onGoToMisAutos}
              />
            )}
          </div>
        </div>
      </div>

      <VinQrScanner
        open={qrReceiveOpen}
        onClose={() => setQrReceiveOpen(false)}
        onDetected={handleQrFromPhone}
        receiveMode
      />
    </div>
  )
}
