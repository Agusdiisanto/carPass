import { useEffect, useMemo, useState } from 'react'
import type { RegistroService, RegistroSiniestro, RegistroVTV } from '../hooks/useCarPass'
import { DEMO_VEHICLES, filterDemoVehicles } from '../domain/carpass/demoVehicles'
import {
  applyDemoCatalogFilters,
  DEMO_CATALOG_FILTER_THRESHOLD,
  type DemoCatalogFilterState,
} from '../domain/carpass/demoCatalogFilters'
import { DemoCatalogFilters } from '../components/DemoCatalogFilters'
import { formatDate, formatKm, formatMonthYear, formatNumber, normalizeVin } from '../domain/carpass/formatters'
import { getReadSourceDetail, type PublicVehicleRecord } from '../domain/carpass/publicRead'
import {
  SINIESTRO_GRAVEDAD_CLASSES,
  SINIESTRO_GRAVEDAD_LABELS,
  VTV_RESULT_CLASSES,
  VTV_RESULT_LABELS,
} from '../domain/carpass/eventLabels'
import { getSealUi } from '../domain/carpass/seal'
import { isValidVin } from '../domain/carpass/validators'
import { DemoVehicleCard } from '../components/DemoVehicleCard'
import { SearchLoadingSkeleton } from '../components/SearchLoadingSkeleton'
import { BrandLogo } from '../components/BrandLogo'
import { VehicleMediaHero } from '../components/VehicleMediaHero'
import { VinQrScanner } from '../components/VinQrScanner'
import { PublicContractBar } from '../components/PublicContractBar'
import { ConnectedWalletStrip } from '../components/ConnectedWalletStrip'
import { PhoneCompanionCard } from '../components/PhoneCompanionCard'
import { MobileStartCard } from '../components/MobileStartCard'
import { MobileOperativeCta } from '../components/MobileOperativeCta'
import { MobileLinkBanner } from '../components/MobileLinkBanner'
import { VinRelayDisplay } from '../components/VinRelayDisplay'
import { VehiclePassportQr } from '../components/VehiclePassportQr'
import type { Role } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'
import { usePublicVehicleLookup } from '../hooks/usePublicVehicleLookup'
import { useVehicleMedia } from '../hooks/useVehicleMedia'
import { isMobileDevice, prefersPhoneCompanion } from '../lib/deviceProfile'
import {
  clearCompanionFromUrl,
  clearVinFromUrl,
  getVinFromLocation,
  isCompanionScanMode,
  getRememberedWalletHint,
} from '../lib/companionUrl'
import { setPendingOperativeVin } from '../lib/operativeVinBridge'
import { getAppSessionFromUrl, syncAppSessionUrl } from '../lib/appSessionUrl'
// ── Types ────────────────────────────────────────────────────────────────────

type TimelineEvent =
  | { kind: 'service';   ts: number; data: RegistroService }
  | { kind: 'vtv';       ts: number; data: RegistroVTV }
  | { kind: 'siniestro'; ts: number; data: RegistroSiniestro }

type Historial = PublicVehicleRecord

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Icons ─────────────────────────────────────────────────────────────────────

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
  const sello = getSealUi(data.sello.estado)
  const media = useVehicleMedia({
    vin: data.info.vin,
    marca: data.info.marca,
    modelo: data.info.modelo,
    anio: data.info.anio,
  })

  return (
    <div className="vh-card">
      <VehicleMediaHero
        marca={data.info.marca}
        modelo={data.info.modelo}
        anio={data.info.anio}
        imageUrl={media.imageUrl}
        loading={media.loading}
        sealLabel={sello.label.toUpperCase()}
        sealClassName={sello.cls}
      />
      <div className="vh-top vh-top--with-media">
        <div className="vh-identity">
          <div className="vh-identity-row">
            <BrandLogo marca={data.info.marca} size="sm" />
            <p className="vh-brand">{data.info.marca.toUpperCase()}</p>
          </div>
          <h2 className="vh-model">{data.info.modelo}</h2>
          <p className="vh-meta">
            {String(data.info.anio)}
            <span className="vh-sep">·</span>
            {data.info.color}
            <span className="vh-sep">·</span>
            <span className="vh-vin">{data.info.vin}</span>
          </p>
          <p className="vh-owner">
            Propietario NFT:{' '}
            <a
              href={`https://sepolia.etherscan.io/address/${data.ownerAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddress(data.ownerAddress)}
            </a>
          </p>
        </div>
      </div>

      <div className="vh-stats">
        <div className="vh-stat">
          <span className="vh-stat-val">{data.services.length}</span>
          <span className="vh-stat-lbl">Services</span>
        </div>
        <div className="vh-stat-sep" />
        <div className="vh-stat">
          <span className="vh-stat-val">{formatNumber(lastKm)}</span>
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

function SourcePill({ data }: { data: Historial }) {
  return (
    <span className={`pv-source-pill pv-source-pill--${data.source}`}>
      {data.sourceLabel}
    </span>
  )
}

function SealQualityCard({ data }: { data: Historial }) {
  const { sello } = data
  const info = getSealUi(sello.estado)
  const sourceDetail = getReadSourceDetail(data)

  return (
    <div className={`sqc ${info.cls}`}>
      <div className="sqc-body">
        <div className={`sqc-icon-wrap ${info.cls}`}>{info.icon}</div>
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
        {sourceDetail}
      </p>
      {data.fallbackReason ? (
        <p className="sqc-fallback">Fallback activado: {data.fallbackReason}</p>
      ) : null}
    </div>
  )
}

// ── Timeline cards ────────────────────────────────────────────────────────────

function ServiceCard({ data }: { data: RegistroService }) {
  return (
    <>
      <p className="tl-title">{data.tipoServicio}</p>
      <p className="tl-km">{formatKm(data.kilometraje)}</p>
      {data.descripcion && <p className="tl-desc">{data.descripcion}</p>}
    </>
  )
}

function VTVCard({ data }: { data: RegistroVTV }) {
  const cls = VTV_RESULT_CLASSES[data.resultado] ?? 'vtv-ok'
  const venc = data.vencimiento > 0n ? formatMonthYear(data.vencimiento) : null
  return (
    <>
      <div className="tl-header-row">
        <p className="tl-title">Inspección VTV</p>
        <span className={`tl-badge ${cls}`}>● {VTV_RESULT_LABELS[data.resultado]}</span>
      </div>
      {venc && <p className="tl-km">Vence {venc}</p>}
    </>
  )
}

function SiniestroCard({ data }: { data: RegistroSiniestro }) {
  const cls = SINIESTRO_GRAVEDAD_CLASSES[data.gravedad] ?? 'sin-leve'
  return (
    <>
      <div className="tl-header-row">
        <p className="tl-title">Siniestro declarado</p>
        <span className={`tl-badge ${cls}`}>{SINIESTRO_GRAVEDAD_LABELS[data.gravedad]}</span>
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
        <span className="tl-date">{formatDate(event.ts)}</span>
        {event.kind === 'service'   && <ServiceCard   data={event.data as RegistroService}   />}
        {event.kind === 'vtv'       && <VTVCard       data={event.data as RegistroVTV}       />}
        {event.kind === 'siniestro' && <SiniestroCard data={event.data as RegistroSiniestro} />}
      </div>
    </div>
  )
}

function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h2v2h-2z" />
      <path d="M20 14h1v1h-1z" />
      <path d="M14 20h2v1h-2z" />
      <path d="M20 17h1v4h-1z" />
      <path d="M17 20h4v1h-4z" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type PublicViewProps = {
  consultaSignal?: number
  connected?: boolean
  walletLinked?: boolean
  role?: Role | null
  detecting?: boolean
  wrongNetwork?: boolean
  walletAddress?: string
  onGoToPanel?: (vin?: string) => void
  onConnectWallet?: () => void
  onSwitchNetwork?: () => void | Promise<void>
}

export function PublicView({
  consultaSignal = 0,
  connected = false,
  walletLinked = false,
  role = null,
  detecting = false,
  wrongNetwork = false,
  walletAddress = '',
  onGoToPanel,
  onConnectWallet,
  onSwitchNetwork,
}: PublicViewProps) {
  const [vin, setVin] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [qrReceiveMode, setQrReceiveMode] = useState(false)
  const [relayVin, setRelayVin] = useState<string | null>(null)
  const [companionSession, setCompanionSession] = useState(
    () => isMobileDevice() && isCompanionScanMode(),
  )
  const [catalogFilters, setCatalogFilters] = useState<DemoCatalogFilterState>({
    seal: 'all',
    km: 'all',
  })
  const lookup = usePublicVehicleLookup()
  const { data, error, loading, loadingVin } = lookup
  const isMobile = isMobileDevice()
  const showPhoneCompanion = connected && !wrongNetwork && prefersPhoneCompanion()
  const canScanFromSearch = isMobile || (connected && !wrongNetwork)
  const companionOperative = Boolean(role && role !== 'none')

  useEffect(() => {
    const urlVin = getVinFromLocation()
    if (!urlVin) return
    setVin(urlVin)
    clearVinFromUrl()
    void lookup.search(urlVin)
  }, [])

  useEffect(() => {
    getRememberedWalletHint()
  }, [])

  useEffect(() => {
    if (!isMobileDevice() || !isCompanionScanMode()) return
    setCompanionSession(true)
    setQrOpen(true)
  }, [])

  useEffect(() => {
    setVin('')
    setRelayVin(null)
    setCompanionSession(false)
    setCatalogFilters({ seal: 'all', km: 'all' })
    lookup.reset()
  }, [consultaSignal])

  useEffect(() => {
    if (!data) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [data?.info.vin])

  const vinFilteredDemos = useMemo(() => filterDemoVehicles(vin), [vin])
  const filteredDemos = useMemo(
    () => applyDemoCatalogFilters(vinFilteredDemos, catalogFilters),
    [vinFilteredDemos, catalogFilters],
  )
  const showCatalogFilters = DEMO_VEHICLES.length > DEMO_CATALOG_FILTER_THRESHOLD
  const vinMatchDemo = useMemo(
    () => DEMO_VEHICLES.find((vehicle) => vehicle.vin === vin),
    [vin],
  )

  async function buscar(vinToSearch = vin) {
    if (!isValidVin(vinToSearch)) return
    await lookup.search(vinToSearch)
  }

  function selectDemo(demoVin: string) {
    setVin(demoVin)
    void buscar(demoVin)
  }

  function reset() {
    lookup.reset()
    setVin('')
    setRelayVin(null)
  }

  function handleGoToPanel() {
    const vinToCarry = data?.info.vin || (isValidVin(vin) ? vin : '')
    if (vinToCarry) {
      setPendingOperativeVin(vinToCarry)
      syncAppSessionUrl({ vin: vinToCarry, wantsPanel: true })
    }
    onGoToPanel?.(vinToCarry || undefined)
  }

  function handleContinueOnPhone(detectedVin: string) {
    setPendingOperativeVin(detectedVin)
    syncAppSessionUrl({ vin: detectedVin, wantsPanel: true })
    setRelayVin(null)
    setVin(detectedVin)
    void buscar(detectedVin)
    if (connected) onGoToPanel?.(detectedVin)
    else onConnectWallet?.()
  }

  function openLocalScanner() {
    setQrReceiveMode(false)
    setQrOpen(true)
  }

  function openReceiveScanner() {
    setQrReceiveMode(true)
    setQrOpen(true)
  }

  function closeQrScanner() {
    setQrOpen(false)
    setQrReceiveMode(false)
  }

  function handleQrDetected(detectedVin: string) {
    if (role && role !== 'none') {
      setPendingOperativeVin(detectedVin)
      syncAppSessionUrl({ vin: detectedVin, wantsPanel: true })
    } else {
      syncAppSessionUrl({ vin: detectedVin, wantsPanel: false })
    }
    if (isMobileDevice() && companionSession) {
      setRelayVin(detectedVin)
      clearCompanionFromUrl()
      setQrOpen(false)
      setQrReceiveMode(false)
      return
    }
    setVin(detectedVin)
    void buscar(detectedVin)
  }

  const timeline = data ? buildTimeline(data.services, data.siniestros, data.vtv) : []

  // ── Search state ────────────────────────────────────────────────────────────

  if (!data) {
    return (
      <div className="public-view pv-search-state">
        <div className="pv-hero-bg" aria-hidden />
        <div className="pv-layout">
          <header className="pv-hero">
            <p className="pv-eyebrow">Pasaporte vehicular verificable</p>
            <h1 className="pv-title">Consulta el historial y sello de calidad</h1>
            <p className="pv-subtitle">
              Busca por VIN o explora los casos demo cargados en Sepolia. Sin wallet, sin friccion.
            </p>
          </header>

          {isMobile && getRememberedWalletHint() ? (
            <MobileLinkBanner connectedAddress={connected ? walletAddress : undefined} />
          ) : null}

          {walletLinked ? (
            <ConnectedWalletStrip
              role={role}
              detecting={detecting}
              wrongNetwork={wrongNetwork}
              onGoToPanel={handleGoToPanel}
              onScanQr={openLocalScanner}
              showPhoneCompanion={showPhoneCompanion}
              onReceiveFromPhone={showPhoneCompanion ? openReceiveScanner : undefined}
              onSwitchNetwork={onSwitchNetwork}
            />
          ) : null}

          {showPhoneCompanion && !relayVin ? (
            <PhoneCompanionCard
              onReceiveFromPhone={openReceiveScanner}
              operative={companionOperative}
              walletAddress={walletAddress}
            />
          ) : null}

          {isMobile && !relayVin ? (
            <MobileStartCard
              connected={connected}
              onScan={openLocalScanner}
              onConnectWallet={onConnectWallet}
            />
          ) : null}

          {relayVin ? (
            <VinRelayDisplay
              vin={relayVin}
              onSearchHere={() => {
                setVin(relayVin)
                void buscar(relayVin)
                setRelayVin(null)
              }}
              onScanAnother={() => {
                setRelayVin(null)
                setCompanionSession(true)
                setQrReceiveMode(false)
                setQrOpen(true)
              }}
              onContinueOnPhone={
                companionOperative || getAppSessionFromUrl().wantsPanel ? handleContinueOnPhone : undefined
              }
            />
          ) : null}

          <PublicContractBar connected={connected} />

          <section className="pv-search-panel" aria-label="Busqueda por VIN">
            <div className={`vin-search-bar ${canScanFromSearch ? 'vin-search-bar--with-qr' : ''}`}>
              <span className="vin-search-bar__icon" aria-hidden>
                <SearchIcon />
              </span>
              <input
                className="vin-search-bar__input"
                maxLength={17}
                placeholder="Ingresa el VIN de 17 caracteres"
                value={vin}
                onChange={(e) => {
                  setVin(normalizeVin(e.target.value))
                  lookup.reset()
                }}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                autoComplete="off"
                spellCheck={false}
                aria-label="Numero VIN"
              />
              {canScanFromSearch ? (
                <button
                  type="button"
                  className="vin-search-bar__qr"
                  onClick={openLocalScanner}
                  title="Escanear QR de VIN"
                  aria-label="Escanear QR de VIN"
                >
                  <QrIcon />
                </button>
              ) : null}
              <button
                type="button"
                className="vin-search-bar__btn"
                disabled={!isValidVin(vin) || loading}
                onClick={() => buscar()}
              >
                {loading ? '...' : 'Buscar'}
              </button>
            </div>

            <div className="pv-search-meta">
              <span className={`pv-vin-counter ${isValidVin(vin) ? 'ready' : ''}`}>
                {vin.length}/17 caracteres
              </span>
              {vinMatchDemo ? (
                <span className="pv-vin-hint">
                  Coincide con {vinMatchDemo.marca} {vinMatchDemo.modelo} demo
                </span>
              ) : null}
            </div>

            {error ? <p className="pv-error">{error}</p> : null}
          </section>

          {loading ? (
            <SearchLoadingSkeleton />
          ) : (
            <section className="pv-catalog" aria-label="Vehiculos de demostracion">
              <div className="pv-catalog-head">
                <div>
                  <h2 className="pv-catalog-title">Flota demo on-chain</h2>
                  <p className="pv-catalog-sub">
                    Cada tarjeta muestra marca, kilometraje, sello esperado y VIN. Toca para cargar el vehiculo.
                  </p>
                </div>
                <span className="pv-catalog-count">
                  {filteredDemos.length}
                  {showCatalogFilters && filteredDemos.length !== vinFilteredDemos.length
                    ? ` / ${vinFilteredDemos.length}`
                    : ''}{' '}
                  vehiculos
                </span>
              </div>

              {showCatalogFilters ? (
                <DemoCatalogFilters
                  vehicles={vinFilteredDemos}
                  filters={catalogFilters}
                  resultCount={filteredDemos.length}
                  onChange={setCatalogFilters}
                />
              ) : null}

              {filteredDemos.length === 0 ? (
                <div className="pv-catalog-empty">
                  {showCatalogFilters && vinFilteredDemos.length > 0
                    ? 'No hay vehiculos con esos filtros. Proba otro sello o rango de km.'
                    : 'No hay coincidencias para ese filtro. Proba con otro VIN o marca.'}
                </div>
              ) : (
                <div className="pv-vehicle-grid">
                  {filteredDemos.map((vehicle) => (
                    <DemoVehicleCard
                      key={vehicle.vin}
                      vehicle={vehicle}
                      active={vin === vehicle.vin}
                      loading={loading && loadingVin === vehicle.vin}
                      onSelect={selectDemo}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <VinQrScanner
          open={qrOpen}
          onClose={closeQrScanner}
          onDetected={handleQrDetected}
          receiveMode={qrReceiveMode}
        />
      </div>
    )
  }
  // ── Results state ───────────────────────────────────────────────────────────

  return (
    <div className="public-view pv-results-state">
      <div className="pv-results-topbar">
        <div className="pv-results-shell">
          <div className="pv-results-topbar-row">
            <button className="pv-back-btn" onClick={reset} title="Volver">
              <BackIcon />
            </button>
            <span className="pv-results-vin">{data.info.vin}</span>
            <SourcePill data={data} />
            <button
              className="pv-share-btn"
              onClick={() => navigator.clipboard?.writeText(data.info.vin)}
              title="Copiar VIN"
            >
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="pv-results-shell">
      <div className="pv-content">
        <div className="pv-passport-layout">
          <VehicleHeroCard data={data} />
          <VehiclePassportQr
            vin={data.info.vin}
            marca={data.info.marca}
            modelo={data.info.modelo}
            anio={data.info.anio}
            color={data.info.color}
            connected={connected}
            role={role}
            onGoToPanel={connected ? handleGoToPanel : undefined}
          />
        </div>
        <SealQualityCard data={data} />

        {isMobile && getRememberedWalletHint() ? (
          <MobileLinkBanner connectedAddress={connected ? walletAddress : undefined} />
        ) : null}

        {isMobile ? (
          <MobileOperativeCta
            vin={data.info.vin}
            connected={connected}
            role={role}
            detecting={detecting}
            wrongNetwork={wrongNetwork}
            onGoToPanel={handleGoToPanel}
            onConnectWallet={onConnectWallet}
          />
        ) : null}

        {connected && onGoToPanel && (!role || role === 'none') && !isMobile ? (
          <button type="button" className="pv-connected-banner__btn pv-connected-banner__btn--inline" onClick={handleGoToPanel}>
            Operar este vehículo (panel por rol)
          </button>
        ) : null}

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
    </div>
  )
}
