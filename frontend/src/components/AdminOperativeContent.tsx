import type { AdminOperativeSectionKey } from '../domain/carpass/adminSections'
import { AdminOperateHub } from './AdminOperateHub'
import { AseguradoraView } from '../views/AseguradoraView'
import { InspectorVTVView } from '../views/InspectorVTVView'
import { PropietarioView } from '../views/PropietarioView'
import { RegistradorView } from '../views/RegistradorView'
import { TallerView } from '../views/TallerView'

type AdminOperativeContentProps = {
  section: AdminOperativeSectionKey
  address: string
  wrongNetwork: boolean
  onOpen: (key: AdminOperativeSectionKey) => void
  onReceiveFromPhone: () => void
}

export function AdminOperativeContent({
  section,
  address,
  wrongNetwork,
  onOpen,
  onReceiveFromPhone,
}: AdminOperativeContentProps) {
  if (section === 'inicio') {
    return (
      <AdminOperateHub
        wrongNetwork={wrongNetwork}
        walletAddress={address}
        onOpen={onOpen}
        onReceiveFromPhone={onReceiveFromPhone}
      />
    )
  }

  if (section === 'propietario') {
    return <PropietarioView address={address} wrongNetwork={wrongNetwork} />
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
