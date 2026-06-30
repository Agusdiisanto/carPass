import type { AdminOperativeSectionKey } from '../domain/carpass/adminSections'
import { AdminOperateHub } from './AdminOperateHub'
import { PropietarioFleetPanel } from './PropietarioFleetPanel'
import { AseguradoraView } from '../views/AseguradoraView'
import { InspectorVTVView } from '../views/InspectorVTVView'
import { RegistradorView } from '../views/RegistradorView'
import { TallerView } from '../views/TallerView'

type AdminOperativeContentProps = {
  section: AdminOperativeSectionKey
  address: string
  wrongNetwork: boolean
  onOpen: (key: AdminOperativeSectionKey) => void
  onReceiveFromPhone: () => void
  onViewPassport?: (vin: string) => void
  onGoToMisAutos?: () => void
}

export function AdminOperativeContent({
  section,
  address,
  wrongNetwork,
  onOpen,
  onReceiveFromPhone,
  onViewPassport = () => {},
  onGoToMisAutos,
}: AdminOperativeContentProps) {
  if (section === 'inicio') {
    return (
      <AdminOperateHub
        wrongNetwork={wrongNetwork}
        walletAddress={address}
        onOpen={onOpen}
        onReceiveFromPhone={onReceiveFromPhone}
        onGoToMisAutos={onGoToMisAutos}
      />
    )
  }

  if (section === 'propietario') {
    return (
      <PropietarioFleetPanel
        address={address}
        wrongNetwork={wrongNetwork}
        onViewPassport={onViewPassport}
        onGoToMisAutos={onGoToMisAutos}
      />
    )
  }
  if (section === 'registrador') {
    return <RegistradorView address={address} wrongNetwork={wrongNetwork} />
  }
  if (section === 'taller') {
    return <TallerView address={address} wrongNetwork={wrongNetwork} />
  }
  if (section === 'aseguradora') {
    return <AseguradoraView address={address} wrongNetwork={wrongNetwork} />
  }

  return <InspectorVTVView address={address} wrongNetwork={wrongNetwork} />
}
