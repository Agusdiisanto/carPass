import { useEffect, useState } from 'react'
import { VinQrScanner } from '../components/VinQrScanner'
import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin, isValidWalletAddress } from '../domain/carpass/validators'
import { useCarPass } from '../hooks/useCarPass'
import type { TransferenciaVehiculo, VehiculoInfo } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'
import { clearVinFromUrl, getVinFromLocation } from '../lib/companionUrl'
import { takePendingOperativeVin } from '../lib/operativeVinBridge'

type MiVehiculo = { tokenId: bigint; info: VehiculoInfo }
type VehiculoDominio = MiVehiculo & { owner: string }

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function PropietarioView({
  address,
  wrongNetwork = false,
  embedded = false,
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
}) {
  const {
    busy,
    message,
    getMisVehiculos,
    getVehiculoPorVin,
    getPropietario,
    getTransferenciasVehiculo,
    transferirVehiculo,
  } = useCarPass()

  const [cargando, setCargando] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [vehiculos, setVehiculos] = useState<MiVehiculo[]>([])
  const [seleccionado, setSeleccionado] = useState<VehiculoDominio | null>(null)
  const [transferencias, setTransferencias] = useState<TransferenciaVehiculo[]>([])
  const [vinBusqueda, setVinBusqueda] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)

  const [destinatario, setDestinatario] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const destinatarioValido = isValidWalletAddress(destinatario)
  const destinatarioPropio = destinatario.toLowerCase() === address.toLowerCase()
  const walletEsPropietaria = seleccionado?.owner.toLowerCase() === address.toLowerCase()
  const puedeTransferir = Boolean(
    seleccionado &&
      walletEsPropietaria &&
      destinatarioValido &&
      !destinatarioPropio &&
      !wrongNetwork &&
      !busy,
  )

  useEffect(() => {
    setCargando(true)
    getMisVehiculos(address)
      .then(setVehiculos)
      .catch(() => setVehiculos([]))
      .finally(() => setCargando(false))
  }, [address])

  useEffect(() => {
    if (bootstrapped) return

    const urlVin = getVinFromLocation()
    const pendingVin = takePendingOperativeVin()
    const initialVin = urlVin ?? pendingVin

    if (urlVin) clearVinFromUrl()
    if (initialVin) {
      setVinBusqueda(initialVin)
      void buscarPorVin(initialVin)
    }

    setBootstrapped(true)
  }, [bootstrapped])

  async function cargarDetalle(v: MiVehiculo) {
    setLookupError('')
    setBuscando(true)
    setDestinatario('')
    setConfirmando(false)

    try {
      const [owner, historial] = await Promise.all([
        getPropietario(v.tokenId),
        getTransferenciasVehiculo(v.tokenId).catch(() => []),
      ])
      setSeleccionado({ ...v, owner })
      setTransferencias(historial)
    } catch {
      setSeleccionado(null)
      setTransferencias([])
      setLookupError('No se pudo leer el titular actual del vehiculo.')
    } finally {
      setBuscando(false)
    }
  }

  async function buscarPorVin(vinToSearch = vinBusqueda) {
    const vinNormalizado = normalizeVin(vinToSearch)
    setVinBusqueda(vinNormalizado)
    if (!isValidVin(vinNormalizado)) return

    setLookupError('')
    setBuscando(true)
    setDestinatario('')
    setConfirmando(false)

    try {
      const vehiculo = await getVehiculoPorVin(vinNormalizado)
      const [owner, historial] = await Promise.all([
        getPropietario(vehiculo.tokenId),
        getTransferenciasVehiculo(vehiculo.tokenId).catch(() => []),
      ])
      setSeleccionado({ ...vehiculo, owner })
      setTransferencias(historial)

      if (owner.toLowerCase() !== address.toLowerCase()) {
        setLookupError('Este vehiculo existe, pero la wallet conectada no es la propietaria actual.')
      }
    } catch {
      setSeleccionado(null)
      setTransferencias([])
      setLookupError('No se encontro un vehiculo registrado para ese VIN.')
    } finally {
      setBuscando(false)
    }
  }

  function seleccionar(v: MiVehiculo) {
    setVinBusqueda(v.info.vin)
    void cargarDetalle(v)
  }

  async function handleQrDetected(vin: string) {
    setQrOpen(false)
    await buscarPorVin(vin)
  }

  function limpiarSeleccion() {
    setSeleccionado(null)
    setTransferencias([])
    setVinBusqueda('')
    setLookupError('')
    setDestinatario('')
    setConfirmando(false)
  }

  async function handleTransferir() {
    if (!seleccionado) return

    const ok = await transferirVehiculo(address, destinatario, seleccionado.tokenId)
    if (!ok) return

    setVehiculos((prev) => prev.filter((v) => v.tokenId !== seleccionado.tokenId))
    setSeleccionado({ ...seleccionado, owner: destinatario })
    setDestinatario('')
    setConfirmando(false)

    const historial = await getTransferenciasVehiculo(seleccionado.tokenId).catch(() => [])
    setTransferencias(historial)
  }

  const panels = (
    <div className="panels-grid">
      <section className="panel">
        <h3>
          Cambio de dominio
          {!cargando && <span className="panel-count">{vehiculos.length}</span>}
        </h3>
        <p className="panel-desc">
          Detectados desde eventos on-chain para <code>{shortAddress(address)}</code>. Tambien podes buscar por VIN o escanear el pasaporte.
        </p>

        <div className="prop-search">
          <div className="vin-search-bar vin-search-bar--with-qr">
            <input
              className="vin-search-bar__input"
              maxLength={17}
              placeholder="VIN de 17 caracteres"
              value={vinBusqueda}
              onChange={(e) => {
                setVinBusqueda(normalizeVin(e.target.value))
                setLookupError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && buscarPorVin()}
              autoComplete="off"
              spellCheck={false}
              aria-label="VIN para cambio de dominio"
            />
            <button
              type="button"
              className="vin-search-bar__qr"
              onClick={() => setQrOpen(true)}
              title="Escanear QR del vehiculo"
              aria-label="Escanear QR del vehiculo"
            >
              QR
            </button>
            <button
              type="button"
              className="vin-search-bar__btn"
              disabled={!isValidVin(vinBusqueda) || buscando}
              onClick={() => buscarPorVin()}
            >
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>
          <div className="op-identify__meta">
            <span className={`op-identify__counter ${isValidVin(vinBusqueda) ? 'ready' : ''}`}>
              {vinBusqueda.length}/17
            </span>
            <span className="op-identify__meta-hint">Acepta VIN manual, QR del pasaporte o VIN recibido del celular.</span>
          </div>
          {lookupError ? <p className="error-msg">{lookupError}</p> : null}
        </div>

        {cargando && (
          <div className="prop-loading">
            <span className="op-shell__live-dot" aria-hidden />
            Consultando blockchain...
          </div>
        )}

        {!cargando && vehiculos.length === 0 && (
          <p className="prop-empty">No se encontraron vehiculos asociados a esta wallet.</p>
        )}

        {!cargando && vehiculos.length > 0 && (
          <ul className="prop-list">
            {vehiculos.map((v) => (
              <li
                key={String(v.tokenId)}
                className={`prop-item ${seleccionado?.tokenId === v.tokenId ? 'prop-item--active' : ''}`}
                onClick={() => seleccionar(v)}
              >
                <div className="prop-item__vin">{v.info.vin}</div>
                <div className="prop-item__desc">
                  {v.info.marca} {v.info.modelo} - {v.info.anio} - {v.info.color}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {seleccionado && (
        <section className="panel">
          <h3>Transferir dominio CarPass</h3>
          <p className="panel-desc">
            <strong>{seleccionado.info.marca} {seleccionado.info.modelo} {seleccionado.info.anio}</strong>
            {' - '}<code>{seleccionado.info.vin}</code>
          </p>

          <div className="domain-summary">
            <div className="domain-summary__row">
              <span>Titular actual</span>
              <code>{shortAddress(seleccionado.owner)}</code>
            </div>
            <div className="domain-summary__row">
              <span>Wallet conectada</span>
              <code>{shortAddress(address)}</code>
            </div>
            <span className={`ownership-badge ${walletEsPropietaria ? 'owner' : 'not-owner'}`}>
              {walletEsPropietaria ? 'Autorizada para transferir' : 'Solo lectura'}
            </span>
          </div>

          {!walletEsPropietaria ? (
            <p className="error-msg">
              Para transferir este pasaporte, conecta la wallet propietaria actual.
            </p>
          ) : null}

          <label className="field">
            Wallet del comprador
            <input
              placeholder="Direccion 0x..."
              value={destinatario}
              disabled={!walletEsPropietaria}
              onChange={(e) => {
                setDestinatario(e.target.value)
                setConfirmando(false)
              }}
            />
          </label>
          {destinatario && !destinatarioValido && <p className="error-msg">Direccion invalida</p>}
          {destinatario && destinatarioValido && destinatarioPropio && (
            <p className="error-msg">No podes transferirte a vos mismo</p>
          )}

          {!confirmando ? (
            <button
              className="btn-danger full-width"
              disabled={!puedeTransferir}
              onClick={() => setConfirmando(true)}
            >
              Transferir vehiculo
            </button>
          ) : (
            <div className="confirm-block">
              <p className="confirm-block__warning">
                Vas a transferir <strong>{seleccionado.info.marca} {seleccionado.info.modelo}</strong> a{' '}
                <code>{shortAddress(destinatario)}</code>. Esta accion no se puede deshacer desde CarPass.
              </p>
              <div className="action-row">
                <button
                  className="btn-danger"
                  disabled={!puedeTransferir}
                  onClick={handleTransferir}
                >
                  {busy === 'Transfiriendo vehiculo' ? 'Transfiriendo...' : 'Confirmar transferencia'}
                </button>
                <button
                  className="btn-ghost"
                  disabled={Boolean(busy)}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="domain-history">
            <div className="domain-history__head">
              <h4>Historial de titularidad</h4>
              <button type="button" className="btn-ghost" onClick={() => cargarDetalle(seleccionado)}>
                Actualizar
              </button>
            </div>
            {transferencias.length === 0 ? (
              <p className="prop-empty">No se pudo leer historial de transferencias para este vehiculo.</p>
            ) : (
              <ul className="domain-history__list">
                {transferencias.map((tx) => (
                  <li key={`${tx.txHash}-${tx.blockNumber}`} className="domain-history__item">
                    <div>
                      <strong>{tx.from === ZERO_ADDRESS ? 'Alta inicial' : 'Transferencia'}</strong>
                      <span>Bloque {tx.blockNumber}</span>
                    </div>
                    <p>
                      <code>{tx.from === ZERO_ADDRESS ? 'mint' : shortAddress(tx.from)}</code>
                      <span>-&gt;</span>
                      <code>{shortAddress(tx.to)}</code>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" className="btn-ghost full-width" onClick={limpiarSeleccion}>
            Consultar otro vehiculo
          </button>
        </section>
      )}

      <VinQrScanner
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onDetected={handleQrDetected}
        variant="operativo"
      />
    </div>
  )

  if (embedded) {
    return (
      <>
        {panels}
        {message ? <div className="status-bar">{message}</div> : null}
      </>
    )
  }

  return (
    <div className="view-container">
      <header className="op-shell op-shell--none">
        <div className="op-shell__row">
          <span className="role-badge none">Propietario</span>
          <span className="op-shell__session">
            <span className="op-shell__live-dot" aria-hidden />
            Sesion activa - {shortAddress(address)}
          </span>
        </div>

        {wrongNetwork ? (
          <p className="op-shell__warn">Red incorrecta: cambia a Sepolia en MetaMask para operar.</p>
        ) : null}

        <h2 className="op-shell__title">Cambio de dominio</h2>
        <p className="op-shell__desc">
          Busca por VIN, escanea el pasaporte o elegi un vehiculo de tu wallet para transferir el NFT.
        </p>

        <ul className="op-shell__caps" aria-label="Capacidades del propietario">
          <li>Listado on-chain automatico</li>
          <li>Busqueda por VIN o QR</li>
          <li>Transferencia de dominio CarPass</li>
        </ul>
      </header>

      {panels}
      {message ? <div className="status-bar">{message}</div> : null}
    </div>
  )
}
