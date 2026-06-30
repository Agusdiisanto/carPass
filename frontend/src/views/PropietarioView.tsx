import { useEffect, useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { isValidWalletAddress } from '../domain/carpass/validators'
import { shortAddress } from '../hooks/useWallet'

type MiVehiculo = { tokenId: bigint; info: VehiculoInfo }

export function PropietarioView({ address, wrongNetwork = false }: { address: string; wrongNetwork?: boolean }) {
  const { busy, message, getMisVehiculos, transferirVehiculo } = useCarPass()

  const [cargando, setCargando] = useState(true)
  const [vehiculos, setVehiculos] = useState<MiVehiculo[]>([])
  const [seleccionado, setSeleccionado] = useState<MiVehiculo | null>(null)

  const [destinatario, setDestinatario] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const destinatarioValido = isValidWalletAddress(destinatario)
  const destinatarioPropio = destinatario.toLowerCase() === address.toLowerCase()

  useEffect(() => {
    setCargando(true)
    getMisVehiculos(address)
      .then(setVehiculos)
      .catch(() => setVehiculos([]))
      .finally(() => setCargando(false))
  }, [address])

  function seleccionar(v: MiVehiculo) {
    setSeleccionado(v)
    setDestinatario('')
    setConfirmando(false)
  }

  async function handleTransferir() {
    if (!seleccionado) return
    const ok = await transferirVehiculo(address, destinatario, seleccionado.tokenId)
    if (ok) {
      setVehiculos((prev) => prev.filter((v) => v.tokenId !== seleccionado.tokenId))
      setSeleccionado(null)
      setDestinatario('')
      setConfirmando(false)
    }
  }

  return (
    <div className="view-container">
      <header className="op-shell op-shell--none">
        <div className="op-shell__row">
          <span className="role-badge none">Propietario</span>
          <span className="op-shell__session">
            <span className="op-shell__live-dot" aria-hidden />
            Sesión activa · {shortAddress(address)}
          </span>
        </div>

        {wrongNetwork && (
          <p className="op-shell__warn">Red incorrecta — cambiá a Sepolia en MetaMask para operar.</p>
        )}

        <h2 className="op-shell__title">Mis vehículos</h2>
        <p className="op-shell__desc">Vehículos registrados en esta wallet. Seleccioná uno para transferir la titularidad.</p>

        <ul className="op-shell__caps" aria-label="Capacidades del propietario">
          <li>Listado on-chain automático</li>
          <li>Transferencia de titularidad</li>
        </ul>
      </header>

      <div className="panels-grid">
        <section className="panel">
          <h3>
            Mis vehículos
            {!cargando && <span className="panel-count">{vehiculos.length}</span>}
          </h3>
          <p className="panel-desc">Detectados desde eventos on-chain para <code>{shortAddress(address)}</code></p>

          {cargando && (
            <div className="prop-loading">
              <span className="op-shell__live-dot" aria-hidden />
              Consultando blockchain...
            </div>
          )}

          {!cargando && vehiculos.length === 0 && (
            <p className="prop-empty">No se encontraron vehículos asociados a esta wallet.</p>
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
                    {v.info.marca} {v.info.modelo} · {v.info.anio} · {v.info.color}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {seleccionado && (
          <section className="panel">
            <h3>Transferir titularidad</h3>
            <p className="panel-desc">
              <strong>{seleccionado.info.marca} {seleccionado.info.modelo} {seleccionado.info.anio}</strong>
              {' · '}<code>{seleccionado.info.vin}</code>
            </p>

            <label className="field">
              Wallet del comprador
              <input
                placeholder="Dirección 0x..."
                value={destinatario}
                onChange={(e) => { setDestinatario(e.target.value); setConfirmando(false) }}
              />
            </label>
            {destinatario && !destinatarioValido && <p className="error-msg">Dirección inválida</p>}
            {destinatario && destinatarioValido && destinatarioPropio && (
              <p className="error-msg">No podés transferirte a vos mismo</p>
            )}

            {!confirmando ? (
              <button
                className="btn-danger full-width"
                disabled={!destinatarioValido || destinatarioPropio || Boolean(busy) || wrongNetwork}
                onClick={() => setConfirmando(true)}
              >
                Transferir vehículo
              </button>
            ) : (
              <div className="confirm-block">
                <p className="confirm-block__warning">
                  Vas a transferir <strong>{seleccionado.info.marca} {seleccionado.info.modelo}</strong> a{' '}
                  <code>{shortAddress(destinatario)}</code>. Esta acción no se puede deshacer.
                </p>
                <div className="action-row">
                  <button
                    className="btn-danger"
                    disabled={Boolean(busy)}
                    onClick={handleTransferir}
                  >
                    {busy === 'Transfiriendo vehículo' ? 'Transfiriendo...' : 'Confirmar transferencia'}
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
          </section>
        )}
      </div>

      {message && <div className="status-bar">{message}</div>}
    </div>
  )
}
