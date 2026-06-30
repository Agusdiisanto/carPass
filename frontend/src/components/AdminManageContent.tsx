import type { AdminManageSectionKey } from '../domain/carpass/adminSections'
import { AdminHub } from './AdminHub'
import { AdminManageRolesPanel } from './AdminManageRolesPanel'
import { AdminManageVehiclesPanel } from './AdminManageVehiclesPanel'

type AdminManageContentProps = {
  section: AdminManageSectionKey
  address: string
  wrongNetwork: boolean
  onOpen: (key: AdminManageSectionKey) => void
}

export function AdminManageContent({
  section,
  address,
  wrongNetwork,
  onOpen,
}: AdminManageContentProps) {
  if (section === 'hub') {
    return (
      <AdminHub
        address={address}
        wrongNetwork={wrongNetwork}
        onOpen={onOpen}
      />
    )
  }

  if (section === 'vehiculos') {
    return <AdminManageVehiclesPanel address={address} />
  }

  return <AdminManageRolesPanel address={address} />
}
