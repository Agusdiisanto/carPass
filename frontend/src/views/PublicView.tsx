import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { RegistroService, RegistroSiniestro, RegistroVTV, SelloCalidad, VehiculoInfo } from '../hooks/useCarPass'

// ── Types ────────────────────────────────────────────────────────────────────

type TimelineEvent =
  | { kind: 'service';   ts: number; data: RegistroService }
  | { kind: 'vtv';       ts: number; data: RegistroVTV }
  | { kind: 'siniestro'; ts: number; data: RegistroSiniestro }

type Historial = {
  info: VehiculoInfo
  tokenId: bigint
  services: RegistroService[]
  siniestros: RegistroSiniestro[]
  vtv: RegistroVTV[]
  sello: SelloCalidad
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRAVEDAD  = ['Leve', 'Moderado', 'Grave']
const VTV_LABEL = ['Aprobado', 'Con observaciones', 'Rechazada']

const SELLO: Record<number, { label: string; shortLabel: string; cls: string }> = {
  0: { label: 'Válido',        shortLabel: 'Válido',        cls: 'seal-ok'   },
  1: { label: 'Observaciones', shortLabel: 'Observaciones', cls: 'seal-warn' },
  2: { label: 'No válido',     shortLabel: 'No válido',     cls: 'seal-bad'  },
}

const DEMO_VINS = [
  { vin: '1HGBH41JXMN109186', label: 'Honda Civic',     sello: 0 },
  { vin: '3FADP4EJ8FM123456', label: 'Ford Focus',      sello: 1 },
  { vin: '2T1BURHE0JC043821', label: 'Toyota Corolla',  sello: 2 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: bigint | number) {
  const n = typeof ts === 'bigint' ? Number(ts) : ts
  if (!n) return '—'
  return new Date(n * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMonthYear(ts: bigint | number) {
  const n = typeof ts === 'bigint' ? Number(ts) : ts
  if (!n) return null
  const d = new Date(n * 1000)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function buildTimeline(
  services: RegistroService[],
  siniestros: RegistroSiniestro[],
  vtv: RegistroVTV[],
): TimelineEvent[] {
  return [
    ...services.map((d)   => ({ kind: 'service'   as const, ts: Number(d.timestamp), data: d })),
    ...siniestros.map((d) => ({ kind: 'siniestro' as const, ts: Number(d.timestamp), data: d })),
    ...vtv.map((d)        => ({ kind: 'vtv'       as const, ts: Number(d.timestamp), data: d })),
  ].sort((a, b) => b.ts - a.ts)
}

// ── Logo ─────────────────────────────────────────────────────────────────────

function CarPassLogo() {
  return (
    <div className="pv-logo">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2 L6 6.5 v9.5 c0 7.8 5.3 13.6 10 16 4.7-2.4 10-8.2 10-16 V6.5 Z" fill="#2dd4bf"/>
        <path d="M11 16 l3.5 3.5 7-7.5" stroke="#0a0e12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="pv-logo-text">Car<span className="pv-logo-accent">Pass</span></span>
    </div>
  )
}

// ── Search icon ───────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

// ── Back icon ─────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
    </svg>
  )
}

// ── Share icon ────────────────────────────────────────────────────────────────

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}

// ── Vehicle hero card ─────────────────────────────────────────────────────────

function VehicleHeroCard({ data }: { data: Historial }) {
  const lastKm = data.services.length
    ? Number(data.services[data.services.length - 1].kilometraje)
    : 0
  const sello = SELLO[data.sello.estado] ?? SELLO[1]

  return (
    <div className="vh-card">
      <div className="vh-top">
        <div className="vh-identity">
          <p className="vh-brand">{data.info.marca.toUpperCase()}</p>
          <h2 className="vh-model">{data.info.modelo}</h2>
          <p className="vh-meta">
            {String(data.info.anio)}
            <span className="vh-sep">·</span>
            {data.info.color}
            <span className="vh-sep">·</span>
            <span className="vh-vin">{data.info.vin}</span>
          </p>
        </div>
        <div className={`vh-seal-badge ${sello.cls}`}>
          <span className="vh-seal-check">
            {data.sello.estado === 0 ? '✓' : data.sello.estado === 2 ? '✕' : '!'}
          </span>
          <span className="vh-seal-label">{sello.label.toUpperCase()}</span>
        </div>
      </div>

      <div className="vh-stats">
        <div className="vh-stat">
          <span className="vh-stat-val">{data.services.length}</span>
          <span className="vh-stat-lbl">Services</span>
        </div>
        <div className="vh-stat-sep" />
        <div className="vh-stat">
          <span className="vh-stat-val">{lastKm.toLocaleString('es-AR')}</span>
          <span className="vh-stat-lbl">{data.services.length ? 'Último km' : 'Km inicial'}</span>
        </div>
        <div className="vh-stat-sep" />
        <div className="vh-stat">
          <span className="vh-stat-val">{data.vtv.length}</span>
          <span className="vh-stat-lbl">VTV</span>
        </div>
        <div className="vh-stat-sep" />
        <div className="vh-stat">
          <span className="vh-stat-val">{data.siniestros.length}</span>
          <span className="vh-stat-lbl">Siniestros</span>
        </div>
      </div>
    </div>
  )
}

// ── Seal quality card ─────────────────────────────────────────────────────────

function SealQualityCard({ sello }: { sello: SelloCalidad }) {
  const info = SELLO[sello.estado] ?? SELLO[1]
  const icon = sello.estado === 0 ? '✓' : sello.estado === 2 ? '✕' : '!'

  return (
    <div className={`sqc ${info.cls}`}>
      <div className="sqc-body">
        <div className={`sqc-icon-wrap ${info.cls}`}>{icon}</div>
        <div>
          <p className="sqc-label">{info.label.toUpperCase()}</p>
          <p className="sqc-reason">{sello.motivo}</p>
        </div>
      </div>
      <p className="sqc-onchain">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Registro inmutable verificado on-chain · Ethereum Sepolia · ERC-721
      </p>
    </div>
  )
}

// ── Timeline cards ────────────────────────────────────────────────────────────

function ServiceCard({ data }: { data: RegistroService }) {
  return (
    <>
      <p className="tl-title">{data.tipoServicio}</p>
      <p className="tl-km">{Number(data.kilometraje).toLocaleString('es-AR')} km</p>
      {data.descripcion && <p className="tl-desc">{data.descripcion}</p>}
    </>
  )
}

function VTVCard({ data }: { data: RegistroVTV }) {
  const cls = ['vtv-ok', 'vtv-warn', 'vtv-bad'][data.resultado] ?? 'vtv-ok'
  const venc = data.vencimiento > 0n ? fmtMonthYear(data.vencimiento) : null
  return (
    <>
      <div className="tl-header-row">
        <p className="tl-title">Inspección VTV</p>
        <span className={`tl-badge ${cls}`}>● {VTV_LABEL[data.resultado]}</span>
      </div>
      {venc && <p className="tl-km">Vence {venc}</p>}
    </>
  )
}

function SiniestroCard({ data }: { data: RegistroSiniestro }) {
  const cls = ['sin-leve', 'sin-mod', 'sin-grave'][data.gravedad] ?? 'sin-leve'
  return (
    <>
      <div className="tl-header-row">
        <p className="tl-title">Siniestro declarado</p>
        <span className={`tl-badge ${cls}`}>{GRAVEDAD[data.gravedad]}</span>
      </div>
      {data.descripcion && <p className="tl-desc">{data.descripcion}</p>}
      <p className="tl-km">{data.reparado ? 'Reparado' : 'Sin reparar'}</p>
    </>
  )
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const config = {
    service:   { letter: 'S', cls: 'dot-service' },
    vtv:       { letter: 'V', cls: 'dot-vtv'     },
    siniestro: { letter: '!', cls: 'dot-sin'     },
  }[event.kind]

  return (
    <div className={`tl-item tl-${event.kind}`}>
      <div className="tl-left">
        <div className={`tl-dot ${config.cls}`}>{config.letter}</div>
        <div className="tl-line" />
      </div>
      <div className="tl-card">
        <span className="tl-date">{fmtDate(event.ts)}</span>
        {event.kind === 'service'   && <ServiceCard   data={event.data as RegistroService}   />}
        {event.kind === 'vtv'       && <VTVCard       data={event.data as RegistroVTV}       />}
        {event.kind === 'siniestro' && <SiniestroCard data={event.data as RegistroSiniestro} />}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PublicView() {
  const [vin, setVin]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [data, setData]       = useState<Historial | null>(null)
  const { getVehiculoPorVin, getHistorial } = useCarPass()

  async function buscar(vinToSearch = vin) {
    if (vinToSearch.length !== 17) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const { tokenId, info } = await getVehiculoPorVin(vinToSearch)
      if (!info.vin) { setError('No se encontró ningún vehículo con ese VIN.'); return }
      const historial = await getHistorial(tokenId)
      setData({ tokenId, info, ...historial })
    } catch {
      setError('No se pudo consultar el contrato. Verificá tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  function selectDemo(demoVin: string) {
    setVin(demoVin)
    setError('')
    buscar(demoVin)
  }

  function reset() {
    setData(null)
    setError('')
  }

  const timeline = data ? buildTimeline(data.services, data.siniestros, data.vtv) : []

  // ── Search state ────────────────────────────────────────────────────────────

  if (!data) {
    return (
      <div className="public-view pv-search-state">
        <div className="pv-center">
          <CarPassLogo />
          <h1 className="pv-title">Verificá un vehículo</h1>
          <p className="pv-subtitle">
            Ingresá el VIN para ver el historial completo y el sello de calidad.
          </p>

          <div className="pv-input-group">
            <input
              className="pv-vin-input"
              maxLength={17}
              placeholder="1HGEM21503L000000"
              value={vin}
              onChange={(e) => { setVin(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="pv-vin-counter">{vin.length}/17 caracteres</span>
          </div>

          <button
            className="pv-btn-consult"
            disabled={vin.length !== 17 || loading}
            onClick={() => buscar()}
          >
            <SearchIcon />
            {loading ? 'Consultando...' : 'Consultar'}
          </button>

          {error && <p className="pv-error">{error}</p>}

          <div className="pv-demos">
            <span className="pv-demos-label">VINS DE DEMOSTRACIÓN</span>
            <div className="pv-chips">
              {DEMO_VINS.map((d) => (
                <button key={d.vin} className="pv-chip" onClick={() => selectDemo(d.vin)}>
                  <span className={`pv-chip-dot ${SELLO[d.sello].cls}`} />
                  {d.label} — {SELLO[d.sello].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Results state ───────────────────────────────────────────────────────────

  return (
    <div className="public-view pv-results-state">
      <div className="pv-results-topbar">
        <button className="pv-back-btn" onClick={reset} title="Volver">
          <BackIcon />
        </button>
        <span className="pv-results-vin">{data.info.vin}</span>
        <button
          className="pv-share-btn"
          onClick={() => navigator.clipboard?.writeText(data.info.vin)}
          title="Copiar VIN"
        >
          <ShareIcon />
        </button>
      </div>

      <div className="pv-content">
        <VehicleHeroCard data={data} />
        <SealQualityCard sello={data.sello} />

        <h3 className="pv-section-title">Historial de eventos</h3>

        {timeline.length === 0 ? (
          <div className="pv-empty">Sin eventos registrados</div>
        ) : (
          <div className="timeline">
            {timeline.map((event, i) => (
              <TimelineItem event={event} key={i} />
            ))}
            <div className="tl-item">
              <div className="tl-left">
                <div className="tl-dot dot-origin">★</div>
              </div>
              <div className="tl-card">
                <p className="tl-title">★ Vehículo registrado en CarPass</p>
              </div>
            </div>
          </div>
        )}

        <button className="pv-btn-reset" onClick={reset}>
          <SearchIcon />
          Consultar otro vehículo
        </button>
      </div>
    </div>
  )
}
