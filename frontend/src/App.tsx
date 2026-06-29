import { useEffect, useState } from 'react'
import './App.css'
import { useWallet, shortAddress, expectedChainId } from './hooks/useWallet'
import { detectRole, hasContractAddress } from './hooks/useCarPass'
import type { Role } from './hooks/useCarPass'
import { ROLE_BADGE_CLASS, ROLE_LABELS } from './domain/carpass/roles'
import { AdminView } from './views/AdminView'
import { RegistradorView } from './views/RegistradorView'
import { TallerView } from './views/TallerView'
import { AseguradoraView } from './views/AseguradoraView'
import { InspectorVTVView } from './views/InspectorVTVView'
import { NoRoleView } from './views/NoRoleView'
import { PublicView } from './views/PublicView'

export default function App() {
  const { address, chainId, connected, wrongNetwork, connect } = useWallet()
  const [role, setRole] = useState<Role | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [showPublic, setShowPublic] = useState(false)

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
    if (showPublic) return <PublicView />
    if (!connected) return <PublicView />
    if (detecting) return <div className="loading-state">Detectando rol...</div>
    if (!role) return <PublicView />
    if (role === 'admin') return <AdminView address={address} />
    if (role === 'registrador') return <RegistradorView address={address} />
    if (role === 'mecanico') return <TallerView address={address} />
    if (role === 'aseguradora') return <AseguradoraView address={address} />
    if (role === 'inspector') return <InspectorVTVView address={address} />
    return <NoRoleView address={address} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={() => setShowPublic(false)} style={{ cursor: 'pointer' }}>
          <h1>CarPass</h1>
          <p className="brand-sub">Trazabilidad vehicular sobre blockchain</p>
        </div>

        <nav className="topbar-nav">
          <button
            className={`nav-btn ${showPublic ? 'active' : ''}`}
            onClick={() => setShowPublic(true)}
          >
            Consulta publica
          </button>

          {connected && role && !showPublic && (
            <span className={`role-badge-nav ${ROLE_BADGE_CLASS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
          )}

          {wrongNetwork && (
            <span className="network-badge warn">Red incorrecta — necesitas Sepolia ({expectedChainId})</span>
          )}

          {connected && !wrongNetwork && (
            <span className="network-badge ok">Sepolia</span>
          )}

          <button
            className={connected ? 'btn-wallet connected' : 'btn-wallet'}
            onClick={() => { setShowPublic(false); connect() }}
          >
            {connected ? shortAddress(address) : 'Conectar wallet'}
          </button>
        </nav>
      </header>

      <section className="runtime-strip" aria-label="Estado de conexion">
        <div className={`runtime-item ${hasContractAddress ? 'ok' : 'warn'}`}>
          <span>Contrato</span>
          <strong>{hasContractAddress ? 'Configurado' : 'Pendiente'}</strong>
        </div>
        <div className={`runtime-item ${!connected || !wrongNetwork ? 'ok' : 'warn'}`}>
          <span>Red</span>
          <strong>{chainId ? (wrongNetwork ? `Chain ${chainId}` : 'Sepolia') : 'Sin wallet'}</strong>
        </div>
        <div className={`runtime-item ${connected ? 'ok' : 'neutral'}`}>
          <span>Wallet</span>
          <strong>{connected ? shortAddress(address) : 'No conectada'}</strong>
        </div>
      </section>

      {!hasContractAddress && (
        <div className="config-warning">
          Contrato no configurado — establecé <code>VITE_CARPASS_CONTRACT_ADDRESS</code> en el archivo <code>.env</code>
        </div>
      )}

      <main>{renderView()}</main>
    </div>
  )
}
