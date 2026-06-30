import { useEffect, useState } from 'react'
import './App.css'
import { useWallet, expectedChainId } from './hooks/useWallet'
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
import { isMobileDevice } from './lib/deviceProfile'
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
    walletLinked,
    wrongNetwork,
    restoring,
    connectionMode,
    needsMobileWallet,
    connecting,
    pairingUri,
    connectError,
    connect,
    switchToSepolia,
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
    if (!walletLinked) return
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

    if (!walletLinked) {
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
  }, [walletLinked, restoring, panelRestored])

  useEffect(() => {
    if (restoring || detecting || !walletLinked) return
    const session = getAppSessionFromUrl()
    if (!session.wantsPanel || !session.vin) return
    if (!role || role === 'none') return
    if (!showPublic) return
    setShowPublic(false)
    savePanelOpenPreference(true)
    setPendingOperativeVin(session.vin)
  }, [walletLinked, detecting, restoring, role, showPublic])

  useEffect(() => {
    if (restoring || detecting || !walletLinked) return
    const session = getAppSessionFromUrl()
    if (!session.wantsPanel) return
    if (role !== 'none') return
    setShowPublic(true)
  }, [walletLinked, detecting, restoring, role])

  useEffect(() => {
    if (!address || !hasContractAddress) {
      setRole(null)
      return
    }

    setDetecting(true)
    detectRole(address)
      .then(setRole)
      .catch(() => setRole('none'))
      .finally(() => setDetecting(false))
  }, [address])

  function renderView() {
    if (showPublic || !walletLinked) {
      return (
        <PublicView
          consultaSignal={consultaSignal}
          connected={connected}
          walletLinked={walletLinked}
          role={role}
          detecting={detecting}
          wrongNetwork={wrongNetwork}
          walletAddress={address}
          onGoToPanel={goToPanel}
          onConnectWallet={handleConnect}
          onSwitchNetwork={() => { void switchToSepolia() }}
        />
      )
    }

    if (detecting) return <RoleDetectingState address={address} />

    if (!role) {
      return (
        <PublicView
          consultaSignal={consultaSignal}
          connected={connected}
          walletLinked={walletLinked}
          role={role}
          detecting={detecting}
          wrongNetwork={wrongNetwork}
          walletAddress={address}
          onGoToPanel={goToPanel}
          onConnectWallet={handleConnect}
          onSwitchNetwork={() => { void switchToSepolia() }}
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
    <div className={`app-shell${showPublic ? ' app-shell--public' : ''}`}>
      <Topbar
        connected={connected}
        walletLinked={walletLinked}
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

      {!walletLinked && !restoring && connectionMode !== 'injected' && !(isMobileDevice() && showPublic) ? (
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

      {walletLinked && wrongNetwork && !restoring ? (
        <div className="wallet-hint-shell">
          <section className="network-switch-banner" aria-label="Red incorrecta">
            <div className="network-switch-banner__copy">
              <p className="network-switch-banner__title">Cambiá a Sepolia para operar</p>
              <p className="network-switch-banner__text">
                Tu wallet está conectada pero en otra red. CarPass opera en Sepolia ({expectedChainId}).
              </p>
            </div>
            <button type="button" className="network-switch-banner__btn" onClick={() => void switchToSepolia()}>
              Cambiar a Sepolia
            </button>
          </section>
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
