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
import { MobileWalletHint } from './components/MobileWalletHint'
import { RuntimeStrip } from './components/RuntimeStrip'
import { RoleDetectingState } from './components/RoleDetectingState'
import { Topbar } from './components/Topbar'
import { clearOperativeSessionFromUrl, getAppSessionFromUrl, syncAppSessionUrl } from './lib/appSessionUrl'
import { setPendingOperativeVin } from './lib/operativeVinBridge'

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
  const {
    address,
    chainId,
    connected,
    wrongNetwork,
    restoring,
    connectionMode,
    needsMobileWallet,
    connecting,
    pairingUri,
    connectError,
    connect,
    openInMetaMaskApp,
    openMetaMaskInstall,
    disconnect,
  } = useWallet()
  const [role, setRole] = useState<Role | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [showPublic, setShowPublic] = useState(true)
  const [consultaSignal, setConsultaSignal] = useState(0)
  const [panelRestored, setPanelRestored] = useState(false)

  function goToConsulta() {
    setShowPublic(true)
    savePanelOpenPreference(false)
    clearOperativeSessionFromUrl()
    setConsultaSignal((value) => value + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToPanel(vin?: string) {
    if (!connected) return
    const sessionVin = vin ?? getAppSessionFromUrl().vin
    if (sessionVin) setPendingOperativeVin(sessionVin)
    syncAppSessionUrl({ wantsPanel: true, vin: sessionVin ?? null })
    setShowPublic(false)
    savePanelOpenPreference(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleConnect() {
    try {
      await connect()
    } catch {
      // MetaMask cancelado, no disponible o redirigiendo a la app mobile.
    }
  }

  useEffect(() => {
    const session = getAppSessionFromUrl()
    if (session.vin) setPendingOperativeVin(session.vin)
  }, [])

  useEffect(() => {
    if (restoring || panelRestored) return

    const session = getAppSessionFromUrl()
    const wantsPanel = session.wantsPanel || readPanelOpenPreference()

    if (!connected) {
      if (!session.wantsPanel) setPanelRestored(true)
      return
    }

    if (wantsPanel) {
      if (session.vin) setPendingOperativeVin(session.vin)
      setShowPublic(false)
      savePanelOpenPreference(true)
      syncAppSessionUrl({ wantsPanel: true, vin: session.vin })
    }

    setPanelRestored(true)
  }, [connected, restoring, panelRestored])

  useEffect(() => {
    if (restoring || detecting || !connected) return
    const session = getAppSessionFromUrl()
    if (!session.wantsPanel || !session.vin) return
    if (!role || role === 'none') return
    if (!showPublic) return
    setShowPublic(false)
    savePanelOpenPreference(true)
    setPendingOperativeVin(session.vin)
  }, [connected, detecting, restoring, role, showPublic])

  useEffect(() => {
    if (restoring || detecting || !connected) return
    const session = getAppSessionFromUrl()
    if (!session.wantsPanel) return
    if (role !== 'none') return
    setShowPublic(true)
  }, [connected, detecting, restoring, role])

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
          walletAddress={address}
          onGoToPanel={goToPanel}
          onConnectWallet={handleConnect}
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
          walletAddress={address}
          onGoToPanel={goToPanel}
          onConnectWallet={handleConnect}
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
        needsMobileWallet={needsMobileWallet}
        connectionMode={connectionMode}
        onDisconnect={disconnect}
      />

      {!connected && !restoring && connectionMode !== 'injected' ? (
        <div className="wallet-hint-shell">
          <MobileWalletHint
            mode={connectionMode}
            onOpenMetaMask={openInMetaMaskApp}
            onConnect={handleConnect}
            onInstallExtension={openMetaMaskInstall}
            connecting={connecting}
            pairingUri={pairingUri}
            connectError={connectError}
          />
        </div>
      ) : null}

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
