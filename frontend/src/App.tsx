import { isAddress } from 'ethers'
import './App.css'

const expectedChainId = import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? '11155111'
const contractAddress = import.meta.env.VITE_CARPASS_CONTRACT_ADDRESS ?? ''
const hasContractAddress = isAddress(contractAddress)

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CarPass</p>
          <h1>Trazabilidad vehicular NFT</h1>
        </div>
        <span className="network-pill">Sepolia</span>
      </header>

      <section className="status-grid" aria-label="Estado de configuracion">
        <article className="status-card">
          <span className="status-label">Contrato</span>
          <strong>{hasContractAddress ? 'Configurado' : 'Pendiente'}</strong>
          <code>{hasContractAddress ? contractAddress : 'VITE_CARPASS_CONTRACT_ADDRESS'}</code>
        </article>

        <article className="status-card">
          <span className="status-label">Red esperada</span>
          <strong>Chain ID {expectedChainId}</strong>
          <code>VITE_SEPOLIA_CHAIN_ID</code>
        </article>

        <article className="status-card">
          <span className="status-label">Proveedor</span>
          <strong>{window.ethereum ? 'MetaMask detectado' : 'Sin wallet detectada'}</strong>
          <code>window.ethereum</code>
        </article>
      </section>
    </main>
  )
}

export default App
