import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'

const GRAVEDAD_OPTIONS = [
  { value: 0, label: 'Leve' },
  { value: 1, label: 'Moderado' },
  { value: 2, label: 'Grave' },
]

export function RegistradorView({ address }: { address: string }) {
  const { busy, message, registrarVehiculo, agregarSiniestro, getVehiculoPorVin } = useCarPass()

  const [vin, setVin] = useState('8AJBA3CD4E1234567')
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)

  const [sinVin, setSinVin] = useState('')
  const [gravedad, setGravedad] = useState(0)
  const [sinDesc, setSinDesc] = useState('')
  const [reparado, setReparado] = useState(false)
  const [costo, setCosto] = useState(0)

  async function handleRegistrar() {
    const info: VehiculoInfo = { vin, marca, modelo, anio, color }
    await registrarVehiculo(info, propietario || address)
  }

  async function handleSiniestro() {
    if (sinVin.length !== 17) return
    const { tokenId } = await getVehiculoPorVin(sinVin)
    await agregarSiniestro(tokenId, gravedad, sinDesc, reparado, costo)
    setSinDesc('')
    setCosto(0)
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="role-badge registrador">Concesionaria</div>
        <h2>Panel de concesionaria</h2>
        <p className="view-desc">Registrá vehículos nuevos y declaratorias de siniestros.</p>
      </div>

      <div className="panels-grid">
        <section className="panel">
          <h3>Registrar vehiculo</h3>
          <p className="panel-desc">Alta del pasaporte digital en la blockchain</p>

          <label className="field">
            VIN <span className="field-hint">17 caracteres</span>
            <input maxLength={17} value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} />
            {vin.length > 0 && (
              <span className={`vin-count ${vin.length === 17 ? 'ok' : 'warn'}`}>{vin.length}/17</span>
            )}
          </label>

          <div className="two-col">
            <label className="field">Marca<input value={marca} onChange={(e) => setMarca(e.target.value)} /></label>
            <label className="field">Modelo<input value={modelo} onChange={(e) => setModelo(e.target.value)} /></label>
          </div>

          <div className="two-col">
            <label className="field">
              Año
              <input max="2099" min="1900" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            </label>
            <label className="field">Color<input value={color} onChange={(e) => setColor(e.target.value)} /></label>
          </div>

          <label className="field">
            Propietario
            <input placeholder={address} value={propietario} onChange={(e) => setPropietario(e.target.value)} />
          </label>

          <button
            className="btn-primary full-width"
            disabled={vin.length !== 17 || Boolean(busy)}
            onClick={handleRegistrar}
          >
            {busy === 'Registrando vehiculo' ? 'Registrando...' : 'Registrar vehiculo'}
          </button>
        </section>

        <section className="panel">
          <h3>Declarar siniestro</h3>
          <p className="panel-desc">Registrá un accidente o daño sobre un vehículo existente</p>

          <label className="field">
            VIN del vehiculo
            <input maxLength={17} value={sinVin} onChange={(e) => setSinVin(e.target.value.toUpperCase())} />
          </label>

          <label className="field">
            Gravedad
            <select className="select-input" value={gravedad} onChange={(e) => setGravedad(Number(e.target.value))}>
              {GRAVEDAD_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Descripcion
            <textarea
              className="textarea-input"
              placeholder="Descripcion del siniestro..."
              rows={3}
              value={sinDesc}
              onChange={(e) => setSinDesc(e.target.value)}
            />
          </label>

          <label className="field">
            Costo estimado (en wei)
            <input min="0" type="number" value={costo} onChange={(e) => setCosto(Number(e.target.value))} />
          </label>

          <label className="field checkbox-field">
            <input checked={reparado} type="checkbox" onChange={(e) => setReparado(e.target.checked)} />
            Ya fue reparado
          </label>

          <button
            className="btn-primary full-width"
            disabled={sinVin.length !== 17 || !sinDesc || Boolean(busy)}
            onClick={handleSiniestro}
          >
            {busy === 'Registrando siniestro' ? 'Registrando...' : 'Declarar siniestro'}
          </button>
        </section>
      </div>

      {message && <div className="status-bar">{message}</div>}
    </div>
  )
}
