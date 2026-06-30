import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useWallet, expectedChainId } from './hooks/useWallet'
import { detectRole, hasContractAddress } from './hooks/useCarPass'
import type { Role } from './hooks/useCarPass'
import { AdminView } from './views/AdminView'
import { RegistradorView } from './views/RegistradorView'
import { TallerView } from './views/TallerView'
import { AseguradoraView } from './views/AseguradoraView'
import { InspectorVTVView } from './views/InspectorVTVView'
import { MisAutosView } from './views/MisAutosView'
import { PublicView } from './views/PublicView'
import { MobileWalletHint } from './components/MobileWalletHint'
import { RuntimeStrip } from './components/RuntimeStrip'
import { ChainActivityFeed } from './components/ChainActivityFeed'
import { RoleDetectingState } from './components/RoleDetectingState'
import { AppNavRail, type AppNavSection } from './components/AppNavRail'
import { Topbar } from './components/Topbar'
import { isMobileDevice } from './lib/deviceProfile'
import { clearOperativeSessionFromUrl, getAppSessionFromUrl, syncAppSessionUrl } from './lib/appSessionUrl'
import { setPendingOperativeVin } from './lib/operativeVinBridge'
import {
  hydrateCarPassActivities,
  recordChainActivity,
  setActiveWalletAddress,
} from './lib/chainActivity'
import { shortAddress } from './hooks/useWallet'

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
  const [showMisAutos, setShowMisAutos] = useState(false)
  const [pendingSearchVin, setPendingSearchVin] = useState<string | null>(null)
  const [misAutosTransferVin, setMisAutosTransferVin] = useState<string | null>(null)
  const [consultaSignal, setConsultaSignal] = useState(0)
  const [panelRestored, setPanelRestored] = useState(false)
  const prevAddressRef = useRef('')
  const prevWrongNetworkRef = useRef(false)
  const shouldShowWalletHint =
    !walletLinked &&
    !restoring &&
    connectionMode !== 'injected' &&
    (connecting || Boolean(pairingUri) || Boolean(connectError))

  function goToConsulta(options?: { vin?: string }) {
    setShowPublic(true)
    setShowMisAutos(false)
    setMisAutosTransferVin(null)
    savePanelOpenPreference(false)
    if (options?.vin) {
      syncAppSessionUrl({ wantsPanel: false, vin: options.vin })
      setPendingSearchVin(options.vin)
    } else {
      clearOperativeSessionFromUrl()
      setPendingSearchVin(null)
      setConsultaSignal((value) => value + 1)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToMisAutos(options?: { transferVin?: string }) {
    if (!walletLinked) return
    setShowPublic(false)
    setShowMisAutos(true)
    savePanelOpenPreference(false)
    clearOperativeSessionFromUrl()
    if (options?.transferVin) {
      setPendingOperativeVin(options.transferVin)
      setMisAutosTransferVin(options.transferVin)
    } else {
      setMisAutosTransferVin(null)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function dismissMisAutosTransfer() {
    setMisAutosTransferVin(null)
  }

  function handleGoToPanel(vin?: string) {
    if (vin) setPendingOperativeVin(vin)
    if (role === 'none') {
      goToMisAutos(vin ? { transferVin: vin } : undefined)
      return
    }
    goToPanel(vin)
  }

  function handleGoToMisAutosWithVin(vin: string) {
    setPendingOperativeVin(vin)
    setMisAutosTransferVin(null)
    goToMisAutos()
  }

  function goToPassport(vin: string) {
    goToConsulta({ vin })
  }

  function goToTransfer(vin: string) {
    if (!walletLinked) return
    setPendingOperativeVin(vin)
    goToMisAutos({ transferVin: vin })
  }

  function goToPanel(vin?: string) {
    if (!walletLinked) return
    if (role === 'none') {
      goToMisAutos(vin ? { transferVin: vin } : undefined)
      return
    }
    const sessionVin = vin ?? getAppSessionFromUrl().vin
    if (sessionVin) setPendingOperativeVin(sessionVin)
    syncAppSessionUrl({ wantsPanel: true, vin: sessionVin ?? null })
    setShowPublic(false)
    setShowMisAutos(false)
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
    if (!address) {
      if (prevAddressRef.current) {
        recordChainActivity({
          walletAddress: prevAddressRef.current,
          kind: 'wallet_disconnect',
          status: 'confirmed',
          title: 'Wallet desconectada',
        })
      }
      setActiveWalletAddress('')
      prevAddressRef.current = ''
      return
    }

    const changed = prevAddressRef.current.toLowerCase() !== address.toLowerCase()
    setActiveWalletAddress(address)

    if (changed && walletLinked) {
      recordChainActivity({
        walletAddress: address,
        kind: 'wallet_connect',
        status: 'confirmed',
        title: 'Wallet conectada',
        detail: shortAddress(address),
      })
      void hydrateCarPassActivities(address)
    }

    prevAddressRef.current = address
  }, [address, walletLinked])

  useEffect(() => {
    if (!address || !walletLinked) {
      prevWrongNetworkRef.current = wrongNetwork
      return
    }
    if (wrongNetwork && !prevWrongNetworkRef.current) {
      recordChainActivity({
        walletAddress: address,
        kind: 'network_warn',
        status: 'confirmed',
        title: 'Red incorrecta',
        detail: 'Cambiá a Sepolia para operar con CarPass',
      })
    }
    prevWrongNetworkRef.current = wrongNetwork
  }, [address, walletLinked, wrongNetwork])

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
      setShowMisAutos(false)
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
    if (!showPublic && !showMisAutos) return
    setShowPublic(false)
    setShowMisAutos(false)
    savePanelOpenPreference(true)
    setPendingOperativeVin(session.vin)
  }, [walletLinked, detecting, restoring, role, showPublic, showMisAutos])

  useEffect(() => {
    if (!walletLinked) {
      setShowMisAutos(false)
    }
  }, [walletLinked])

  useEffect(() => {
    if (restoring || detecting || !walletLinked) return
    const session = getAppSessionFromUrl()
    if (!session.wantsPanel) return
    if (role !== 'none') return
    if (session.vin) {
      setPendingOperativeVin(session.vin)
      setMisAutosTransferVin(session.vin)
    }
    setShowPublic(false)
    setShowMisAutos(true)
    savePanelOpenPreference(false)
    syncAppSessionUrl({ wantsPanel: false, vin: session.vin })
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

  function resolveNavSection(): AppNavSection {
    if (showMisAutos && walletLinked) return 'mis-autos'
    if (walletLinked && !showPublic) return 'panel'
    return 'consulta'
  }

  function resolveContextVin(): string | null {
    if (misAutosTransferVin) return misAutosTransferVin
    if (!showPublic && !showMisAutos) {
      const session = getAppSessionFromUrl()
      return session.vin
    }
    return null
  }

  function renderMisAutosView() {
    return (
      <MisAutosView
        address={address}
        wrongNetwork={wrongNetwork}
        transferVin={misAutosTransferVin}
        onTransferDismiss={dismissMisAutosTransfer}
        onViewPassport={goToPassport}
        onTransfer={goToTransfer}
      />
    )
  }

  function renderView() {
    if (showMisAutos && walletLinked) {
      return renderMisAutosView()
    }

    if (showPublic || !walletLinked) {
      return (
        <PublicView
          consultaSignal={consultaSignal}
          pendingSearchVin={pendingSearchVin}
          onPendingSearchVinHandled={() => setPendingSearchVin(null)}
          connected={connected}
          walletLinked={walletLinked}
          role={role}
          detecting={detecting}
          wrongNetwork={wrongNetwork}
          walletAddress={address}
          onGoToPanel={handleGoToPanel}
          onGoToMisAutos={goToMisAutos}
          onGoToMisAutosWithVin={handleGoToMisAutosWithVin}
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
          pendingSearchVin={pendingSearchVin}
          onPendingSearchVinHandled={() => setPendingSearchVin(null)}
          connected={connected}
          walletLinked={walletLinked}
          role={role}
          detecting={detecting}
          wrongNetwork={wrongNetwork}
          walletAddress={address}
          onGoToPanel={handleGoToPanel}
          onGoToMisAutos={goToMisAutos}
          onGoToMisAutosWithVin={handleGoToMisAutosWithVin}
          onConnectWallet={handleConnect}
          onSwitchNetwork={() => { void switchToSepolia() }}
        />
      )
    }

    if (role === 'admin') return (
      <AdminView
        address={address}
        wrongNetwork={wrongNetwork}
        onViewPassport={goToPassport}
        onGoToMisAutos={goToMisAutos}
      />
    )
    if (role === 'registrador') {
      return <RegistradorView address={address} wrongNetwork={wrongNetwork} />
    }
    if (role === 'mecanico') {
      return <TallerView address={address} wrongNetwork={wrongNetwork} />
    }
    if (role === 'aseguradora') {
      return <AseguradoraView address={address} wrongNetwork={wrongNetwork} />
    }
    if (role === 'inspector') {
      return <InspectorVTVView address={address} wrongNetwork={wrongNetwork} />
    }
    return renderMisAutosView()
  }

  return (
    <div className={`app-shell${showPublic ? ' app-shell--public' : ''}${showMisAutos ? ' app-shell--mis-autos' : ''}`}>
      <Topbar
        connected={connected}
        walletLinked={walletLinked}
        wrongNetwork={wrongNetwork}
        address={address}
        role={role}
        detecting={detecting}
        showPublic={showPublic}
        showMisAutos={showMisAutos}
        onGoHome={goToConsulta}
        onShowPublic={goToConsulta}
        onShowMisAutos={goToMisAutos}
        onShowPanel={handleGoToPanel}
        onConnect={handleConnect}
        needsMobileWallet={needsMobileWallet}
        connectionMode={connectionMode}
        onDisconnect={disconnect}
      />

      {shouldShowWalletHint && !(isMobileDevice() && showPublic) ? (
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
              {connectError ? <p className="network-switch-banner__error">{connectError}</p> : null}
            </div>
            <button type="button" className="network-switch-banner__btn" onClick={() => void switchToSepolia()}>
              Cambiar a Sepolia
            </button>
          </section>
        </div>
      ) : null}

      {walletLinked && panelRestored && !restoring ? (
        <AppNavRail
          active={resolveNavSection()}
          role={role}
          walletLinked={walletLinked}
          detecting={detecting}
          contextVin={resolveContextVin()}
          onConsulta={goToConsulta}
          onMisAutos={goToMisAutos}
          onPanel={handleGoToPanel}
          onViewContextVin={goToPassport}
        />
      ) : null}

      <RuntimeStrip
        connected={connected}
        wrongNetwork={wrongNetwork}
        chainId={chainId ? Number(chainId) : null}
        address={address}
        role={role}
        detecting={detecting}
      />

      {walletLinked && address ? (
        <ChainActivityFeed walletAddress={address} wrongNetwork={wrongNetwork} />
      ) : null}

      {!hasContractAddress && (
        <div className="config-warning">
          Contrato no configurado — establece <code>VITE_CARPASS_CONTRACT_ADDRESS</code> en el archivo <code>.env</code>
        </div>
      )}

      <main className={role === 'admin' && !showPublic && !showMisAutos ? 'main--admin' : undefined}>{renderView()}</main>
    </div>
  )
}
