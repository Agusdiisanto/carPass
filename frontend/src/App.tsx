import { useEffect, useState } from 'react'
import './App.css'
import { useWallet } from './hooks/useWallet'
import { detectRole, hasContractAddress } from './hooks/useCarPass'
import type { Role } from './hooks/useCarPass'
import { AdminView } from './views/AdminView'
import { RegistradorView } from './views/RegistradorView'
import { TallerView } from './views/TallerView'
import { AseguradoraView } from './views/AseguradoraView'
import { InspectorVTVView } from './views/InspectorVTVView'
import { PropietarioView } from './views/PropietarioView'
import { PublicView } from './views/PublicView'
import { RuntimeStrip } from './components/RuntimeStrip'
import { RoleDetectingState } from './components/RoleDetectingState'
import { Topbar } from './components/Topbar'

const PANEL_OPEN_KEY = 'carpass_wallet_panel_open'

function readPanelOpenPreference(): boolean {
  try {
    return localStorage.getItem(PANEL_OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function savePanelOpenPreference(open: boolean) {
  try {
    if (open) localStorage.setItem(PANEL_OPEN_KEY, '1')
    else localStorage.removeItem(PANEL_OPEN_KEY)
  } catch {
    // localStorage no disponible.
  }
}

export default function App() {
  const { address, chainId, connected, wrongNetwork, restoring, connect, disconnect } = useWallet()
  const [role, setRole] = useState<Role | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [showPublic, setShowPublic] = useState(true)
  const [consultaSignal, setConsultaSignal] = useState(0)
  const [panelRestored, setPanelRestored] = useState(false)

  function goToConsulta() {
    setShowPublic(true)
    savePanelOpenPreference(false)
    setConsultaSignal((value) => value + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToPanel() {
    if (!connected) return
    setShowPublic(false)
    savePanelOpenPreference(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleConnect() {
    try {
      await connect()
    } catch {
      // MetaMask cancelado o no disponible.
    }
  }

  useEffect(() => {
    if (restoring || panelRestored || !connected) return
    if (readPanelOpenPreference()) setShowPublic(false)
    setPanelRestored(true)
  }, [connected, restoring, panelRestored])

  useEffect(() => {
    if (!connected || !hasContractAddress) {
      setRole(null)
      return
    }

    setDetecting(true)
    detectRole(address)
      .then(setRole)
      .catch(() => setRole('none'))
      .finally(() => setDetecting(false))
  }, [address, connected])

  function renderView() {
    if (showPublic || !connected) {
      return (
        <PublicView
          consultaSignal={consultaSignal}
          connected={connected}
          role={role}
          detecting={detecting}
          wrongNetwork={wrongNetwork}
          onGoToPanel={goToPanel}
        />
      )
    }

    if (detecting) return <RoleDetectingState address={address} />

    if (!role) {
      return (
        <PublicView
          consultaSignal={consultaSignal}
          connected={connected}
          role={role}
          detecting={detecting}
          wrongNetwork={wrongNetwork}
          onGoToPanel={goToPanel}
        />
      )
    }

    if (role === 'admin') return <AdminView address={address} wrongNetwork={wrongNetwork} />
    if (role === 'registrador') return <RegistradorView address={address} wrongNetwork={wrongNetwork} />
    if (role === 'mecanico') return <TallerView address={address} wrongNetwork={wrongNetwork} />
    if (role === 'aseguradora') return <AseguradoraView address={address} wrongNetwork={wrongNetwork} />
    if (role === 'inspector') return <InspectorVTVView address={address} wrongNetwork={wrongNetwork} />
    return <PropietarioView address={address} wrongNetwork={wrongNetwork} />
  }

  return (
    <div className="app-shell">
      <Topbar
        connected={connected}
        wrongNetwork={wrongNetwork}
        address={address}
        role={role}
        detecting={detecting}
        showPublic={showPublic}
        onGoHome={goToConsulta}
        onShowPublic={goToConsulta}
        onShowPanel={goToPanel}
        onConnect={handleConnect}
        onDisconnect={disconnect}
      />

      <RuntimeStrip
        connected={connected}
        wrongNetwork={wrongNetwork}
        chainId={chainId ? Number(chainId) : null}
        address={address}
        role={role}
        detecting={detecting}
      />

      {!hasContractAddress && (
        <div className="config-warning">
          Contrato no configurado — establece <code>VITE_CARPASS_CONTRACT_ADDRESS</code> en el archivo <code>.env</code>
        </div>
      )}

      <main className={role === 'admin' && !showPublic ? 'main--admin' : undefined}>{renderView()}</main>
    </div>
  )
}
