import { BrowserProvider, Contract, isAddress, keccak256, toUtf8Bytes } from 'ethers'
import { useMemo, useState } from 'react'
import './App.css'

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

type ServiceEntry = {
  id: number
  km: number
  kind: string
  author: string
  status: 'accepted' | 'rejected'
  reason: string
}

type SealView = {
  state: number
  label: string
  reason: string
}

const expectedChainId = import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? '11155111'
const configuredAddress = import.meta.env.VITE_CARPASS_CONTRACT_ADDRESS ?? ''
const hasContractAddress = isAddress(configuredAddress)

const carPassAbi = [
  'function registrarVehiculo((string vin,string marca,string modelo,uint16 anio,string color) info,address propietarioInicial) returns (uint256)',
  'function vinToTokenId(string vin) view returns (uint256)',
  'function MECANICO_ROLE() view returns (bytes32)',
  'function grantRole(bytes32 role,address account)',
  'function agregarService(uint256 tokenId,(uint256 timestamp,string tipoServicio,uint32 kilometraje,address taller,string descripcion) registro)',
  'function getHistorialService(uint256 tokenId) view returns ((uint256 timestamp,string tipoServicio,uint32 kilometraje,address taller,string descripcion)[])',
  'function ultimoKilometrajeRegistrado(uint256 tokenId) view returns (uint32)',
  'function getSelloCalidad(uint256 tokenId) view returns (uint8 estado,string motivo)',
  'event ServiceAgregado(uint256 indexed tokenId,uint256 timestamp,string tipoServicio)',
  'error KilometrajeNoMonotonico(uint32 recibido,uint32 ultimo)',
]

const zeroAddress = '0x0000000000000000000000000000000000000000'

function shortAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Sin wallet'
}

function parseChainId(chainId: unknown) {
  if (typeof chainId !== 'string') return ''
  return Number.parseInt(chainId, 16).toString()
}

function vinTokenPreview(vin: string) {
  if (!vin) return '-'
  return BigInt(keccak256(toUtf8Bytes(vin))).toString()
}

function sealLabel(state: number) {
  if (state === 0) return 'Valido'
  if (state === 1) return 'Con observaciones'
  return 'No valido'
}

function App() {
  const [wallet, setWallet] = useState('')
  const [chainId, setChainId] = useState('')
  const [vin, setVin] = useState('8AJBA3CD4E1234567')
  const [owner, setOwner] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [serviceKm, setServiceKm] = useState(15_000)
  const [serviceKind, setServiceKind] = useState('Service oficial')
  const [lastKm, setLastKm] = useState(0)
  const [history, setHistory] = useState<ServiceEntry[]>([])
  const [seal, setSeal] = useState<SealView>({ state: 1, label: 'Sin consultar', reason: 'Esperando lectura' })
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('Listo para modelar')

  const canUseContract = Boolean(wallet && hasContractAddress && chainId === expectedChainId)
  const kmStatus = serviceKm > lastKm ? 'accepted' : 'rejected'
  const tokenPreview = useMemo(() => vinTokenPreview(vin), [vin])

  async function connectWallet() {
    if (!window.ethereum) {
      setMessage('MetaMask no detectado')
      return
    }

    const ethereum = window.ethereum as EthereumProvider
    const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[]
    const currentChain = parseChainId(await ethereum.request({ method: 'eth_chainId' }))
    const account = accounts[0] ?? ''

    setWallet(account)
    setOwner((current) => current || account)
    setWorkshop((current) => current || account)
    setChainId(currentChain)
    setMessage(account ? 'Wallet conectada' : 'Sin cuentas disponibles')
  }

  function simulateService() {
    const accepted = serviceKm > lastKm
    const entry: ServiceEntry = {
      id: Date.now(),
      km: serviceKm,
      kind: serviceKind,
      author: workshop || wallet || '0xTaller',
      status: accepted ? 'accepted' : 'rejected',
      reason: accepted ? 'Kilometraje monotónico' : `Rechazo: ${serviceKm} <= ${lastKm}`,
    }

    setHistory((current) => [entry, ...current])
    if (accepted) setLastKm(serviceKm)
    setMessage(accepted ? 'Service aceptado en simulación' : 'Service rechazado en simulación')
  }

  async function getContract() {
    if (!window.ethereum) throw new Error('MetaMask no detectado')
    if (!hasContractAddress) throw new Error('Contrato no configurado')

    const provider = new BrowserProvider(window.ethereum as EthereumProvider)
    const signer = await provider.getSigner()
    return new Contract(configuredAddress, carPassAbi, signer)
  }

  async function getReadContract() {
    if (!window.ethereum) throw new Error('MetaMask no detectado')
    if (!hasContractAddress) throw new Error('Contrato no configurado')

    const provider = new BrowserProvider(window.ethereum as EthereumProvider)
    return new Contract(configuredAddress, carPassAbi, provider)
  }

  async function runTx(label: string, action: () => Promise<string>) {
    try {
      setBusy(label)
      setMessage(`${label}...`)
      const result = await action()
      setMessage(result)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Transacción rechazada'
      setMessage(reason.split('\n')[0])
    } finally {
      setBusy('')
    }
  }

  async function registerVehicle() {
    await runTx('Registrando vehículo', async () => {
      const contract = await getContract()
      const tx = await contract.registrarVehiculo(
        {
          vin,
          marca: 'Toyota',
          modelo: 'Corolla',
          anio: 2024,
          color: 'Blanco',
        },
        owner || wallet,
      )
      await tx.wait()
      return 'Vehículo registrado'
    })
  }

  async function grantWorkshopRole() {
    await runTx('Asignando taller', async () => {
      const contract = await getContract()
      const role = await contract.MECANICO_ROLE()
      const tx = await contract.grantRole(role, workshop || wallet)
      await tx.wait()
      return 'Rol de taller asignado'
    })
  }

  async function sendService() {
    await runTx('Cargando service', async () => {
      const contract = await getContract()
      const tokenId = await contract.vinToTokenId(vin)
      const tx = await contract.agregarService(tokenId, {
        timestamp: 0,
        tipoServicio: serviceKind,
        kilometraje: serviceKm,
        taller: zeroAddress,
        descripcion: 'Carga desde consola CarPass',
      })
      await tx.wait()

      const latestKm = Number(await contract.ultimoKilometrajeRegistrado(tokenId))
      const chainHistory = await contract.getHistorialService(tokenId)
      const last = chainHistory.at(-1)

      setLastKm(latestKm)
      setHistory((current) => [
        {
          id: Date.now(),
          km: latestKm,
          kind: last?.tipoServicio ?? serviceKind,
          author: last?.taller ?? wallet,
          status: 'accepted',
          reason: 'Confirmado on-chain',
        },
        ...current,
      ])

      return 'Service confirmado on-chain'
    })
  }

  async function querySeal() {
    await runTx('Consultando sello', async () => {
      const contract = await getReadContract()
      const tokenId = await contract.vinToTokenId(vin)
      const [state, reason] = await contract.getSelloCalidad(tokenId)
      const stateNumber = Number(state)

      setSeal({
        state: stateNumber,
        label: sealLabel(stateNumber),
        reason,
      })

      return 'Sello consultado'
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CarPass</p>
          <h1>Consola de contrato y kilometraje</h1>
        </div>
        <button className="primary-action" type="button" onClick={connectWallet}>
          {wallet ? shortAddress(wallet) : 'Conectar'}
        </button>
      </header>

      <section className="status-grid" aria-label="Estado de configuración">
        <article className="status-card">
          <span className="status-label">Contrato</span>
          <strong>{hasContractAddress ? 'Configurado' : 'Pendiente'}</strong>
          <code>{hasContractAddress ? configuredAddress : 'VITE_CARPASS_CONTRACT_ADDRESS'}</code>
        </article>

        <article className="status-card">
          <span className="status-label">Red</span>
          <strong>{chainId || expectedChainId}</strong>
          <code>{chainId === expectedChainId ? 'Sepolia lista' : `Esperada ${expectedChainId}`}</code>
        </article>

        <article className="status-card">
          <span className="status-label">Último km</span>
          <strong>{lastKm.toLocaleString('es-AR')}</strong>
          <code>{kmStatus === 'accepted' ? 'Próximo válido' : 'Rechazo previsto'}</code>
        </article>
      </section>

      <section className="workspace-grid">
        <div className="tool-panel">
          <div className="panel-heading">
            <p className="eyebrow">Modelo</p>
            <h2>Vehículo</h2>
          </div>

          <label>
            VIN
            <input value={vin} maxLength={17} onChange={(event) => setVin(event.target.value.toUpperCase())} />
          </label>

          <div className="two-column">
            <label>
              Propietario
              <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder={wallet || zeroAddress} />
            </label>

            <label>
              Taller
              <input value={workshop} onChange={(event) => setWorkshop(event.target.value)} placeholder={wallet || zeroAddress} />
            </label>
          </div>

          <div className="token-preview">
            <span>Token ID</span>
            <code>{tokenPreview}</code>
          </div>

          <div className="action-row">
            <button type="button" disabled={!canUseContract || Boolean(busy)} onClick={registerVehicle}>
              Registrar
            </button>
            <button type="button" disabled={!canUseContract || Boolean(busy)} onClick={grantWorkshopRole}>
              Asignar taller
            </button>
          </div>
        </div>

        <div className="tool-panel">
          <div className="panel-heading">
            <p className="eyebrow">Epic 05</p>
            <h2>Service</h2>
          </div>

          <label>
            Tipo
            <input value={serviceKind} onChange={(event) => setServiceKind(event.target.value)} />
          </label>

          <label>
            Kilometraje
            <input
              min="0"
              step="500"
              type="number"
              value={serviceKm}
              onChange={(event) => setServiceKm(Number(event.target.value))}
            />
          </label>

          <input
            aria-label="Kilometraje"
            className="km-range"
            max="200000"
            min="0"
            step="500"
            type="range"
            value={serviceKm}
            onChange={(event) => setServiceKm(Number(event.target.value))}
          />

          <div className={`rule-banner ${kmStatus}`}>
            <strong>{kmStatus === 'accepted' ? 'Acepta' : 'Rechaza'}</strong>
            <span>{serviceKm.toLocaleString('es-AR')} km contra último {lastKm.toLocaleString('es-AR')} km</span>
          </div>

          <div className="action-row">
            <button type="button" onClick={simulateService}>
              Simular
            </button>
            <button type="button" disabled={!canUseContract || Boolean(busy)} onClick={sendService}>
              Enviar on-chain
            </button>
          </div>
        </div>

        <div className="tool-panel seal-panel">
          <div className="panel-heading">
            <p className="eyebrow">Epic 06</p>
            <h2>Sello</h2>
          </div>

          <div className={`seal-card seal-${seal.state}`}>
            <span>{seal.label}</span>
            <strong>{seal.reason}</strong>
          </div>

          <div className="action-row">
            <button type="button" disabled={!hasContractAddress || Boolean(busy)} onClick={querySeal}>
              Consultar sello
            </button>
          </div>
        </div>
      </section>

      <section className="history-section">
        <div className="panel-heading">
          <p className="eyebrow">Auditoría</p>
          <h2>Historial de pruebas</h2>
        </div>

        <div className="message-line">{busy || message}</div>

        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-state">Sin services cargados en esta sesión.</p>
          ) : (
            history.map((entry) => (
              <article className="history-item" key={entry.id}>
                <span className={`dot ${entry.status}`} />
                <div>
                  <strong>{entry.kind}</strong>
                  <p>{entry.reason}</p>
                </div>
                <code>{entry.km.toLocaleString('es-AR')} km</code>
                <span className="author">{shortAddress(entry.author)}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

export default App
