import { useEffect, useMemo, useRef, useState } from 'react'
import { getTransferenciasVehiculo } from '../hooks/useCarPass'
import type { RegistroService, RegistroSiniestro, RegistroVTV, TransferenciaVehiculo } from '../hooks/useCarPass'
import { DEMO_VEHICLES, filterDemoVehicles } from '../domain/carpass/demoVehicles'
import {
  applyDemoCatalogFilters,
  DEMO_CATALOG_FILTER_THRESHOLD,
  type DemoCatalogFilterState,
} from '../domain/carpass/demoCatalogFilters'
import { DemoCatalogFilters } from '../components/DemoCatalogFilters'
import { formatDate, formatKm, formatMonthYear, formatNumber, normalizeVin, safeUpperCase } from '../domain/carpass/formatters'
import { getReadSourceDetail, normalizePublicVehicleRecord, type PublicVehicleRecord } from '../domain/carpass/publicRead'
import {
  SINIESTRO_GRAVEDAD_CLASSES,
  SINIESTRO_GRAVEDAD_LABELS,
  VTV_RESULT_CLASSES,
  VTV_RESULT_LABELS,
} from '../domain/carpass/eventLabels'
import { getSealUi } from '../domain/carpass/seal'
import { isValidVin } from '../domain/carpass/validators'
import { siniestroFueReparado, type Parte } from '../domain/carpass/vehicleParts'
import { getPartesVehiculo, hasContractAddress as hasVehiclePartsContract } from '../hooks/useVehicleParts'
import { DemoVehicleCard } from '../components/DemoVehicleCard'
import { SearchLoadingSkeleton } from '../components/SearchLoadingSkeleton'
import { BrandLogo } from '../components/BrandLogo'
import { VehiclePassportFlipHero } from '../components/VehiclePassportFlipHero'
import { VehiclePartsStatusDiagram } from '../components/VehiclePartsStatusDiagram'
import { OracleEvidencePanel } from '../components/OracleEvidencePanel'
import { ConnectedWalletStrip } from '../components/ConnectedWalletStrip'
import { PhoneCompanionCard } from '../components/PhoneCompanionCard'
import { VinSearchPanel } from '../components/VinSearchPanel'
import { MobileOperativeCta } from '../components/MobileOperativeCta'
import { MisVehiculosHomeCard } from '../components/MisVehiculosHomeCard'
import { MobileLinkBanner } from '../components/MobileLinkBanner'
import { VinRelayDisplay } from '../components/VinRelayDisplay'
import { VinQrScanner } from '../components/VinQrScanner'
import type { Role } from '../hooks/useCarPass'
import { shortAddress, isSameWalletAddress } from '../hooks/useWallet'
import { usePublicVehicleLookup } from '../hooks/usePublicVehicleLookup'
import { useChainActivities } from '../hooks/useChainActivities'
import { useVehicleMedia } from '../hooks/useVehicleMedia'
import { isMobileDevice, prefersPhoneCompanion, canUseCameraScan } from '../lib/deviceProfile'
import {
  clearCompanionFromUrl,
  clearVinFromUrl,
  getVinFromLocation,
  isCompanionScanMode,
  getRememberedWalletHint,
} from '../lib/companionUrl'
import { setPendingOperativeVin } from '../lib/operativeVinBridge'
import { subscribeVehicleChainUpdates } from '../lib/vehicleChainRefresh'
import { getAppSessionFromUrl, syncAppSessionUrl } from '../lib/appSessionUrl'
// ── Types ────────────────────────────────────────────────────────────────────

type TimelineEvent =
  | { kind: 'service';   ts: number; data: RegistroService }
  | { kind: 'vtv';       ts: number; data: RegistroVTV }
  | { kind: 'siniestro'; ts: number; data: RegistroSiniestro }
  | { kind: 'transfer';  ts: number; data: TransferenciaVehiculo }

type Historial = PublicVehicleRecord

// ── Constants ─────────────────────────────────────────────────────────────────

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function buildTimeline(
  services: RegistroService[],
  siniestros: RegistroSiniestro[],
  vtv: RegistroVTV[],
  transferencias: TransferenciaVehiculo[] = [],
): TimelineEvent[] {
  return [
    ...services.map((d)   => ({ kind: 'service'   as const, ts: Number(d.timestamp), data: d })),
    ...siniestros.map((d) => ({ kind: 'siniestro' as const, ts: Number(d.timestamp), data: d })),
    ...vtv.map((d)        => ({ kind: 'vtv'       as const, ts: Number(d.timestamp), data: d })),
    ...transferencias
      .filter((d) => d.from.toLowerCase() !== ZERO_ADDRESS)
      .map((d) => ({ kind: 'transfer' as const, ts: d.timestamp ?? d.blockNumber, data: d })),
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

function VehicleHeroCard({
  data,
  connected = false,
  role = null,
  onGoToPanel,
  partsRefreshKey = 0,
}: {
  data: Historial
  connected?: boolean
  role?: Role | null
  onGoToPanel?: () => void
  partsRefreshKey?: number
}) {
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
      <VehiclePassportFlipHero
        key={data.info.vin}
        marca={data.info.marca}
        modelo={data.info.modelo}
        anio={data.info.anio}
        imageUrl={media.imageUrl}
        loading={media.loading}
        sealLabel={safeUpperCase(sello.label)}
        sealClassName={sello.cls}
        vin={data.info.vin}
        color={data.info.color}
        connected={connected}
        role={role}
        onGoToPanel={onGoToPanel}
      />
      <div className="vh-top vh-top--with-media">
        <div className="vh-identity">
          <div className="vh-identity-row">
            <BrandLogo marca={data.info.marca} size="sm" />
            <p className="vh-brand">{safeUpperCase(data.info.marca)}</p>
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

      <VehiclePartsStatusDiagram tokenId={data.tokenId} refreshKey={partsRefreshKey} />
    </div>
  )
}

// ── Seal quality card ─────────────────────────────────────────────────────────

function SourcePill({ data, syncing = false }: { data: Historial; syncing?: boolean }) {
  return (
    <span className={`pv-source-pill pv-source-pill--${data.source}`}>
      {syncing ? 'Actualizando...' : data.sourceLabel}
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
          <p className="sqc-label">{safeUpperCase(info.label)}</p>
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

function SiniestroCard({ data, partes }: { data: RegistroSiniestro; partes: Parte[] }) {
  const cls = SINIESTRO_GRAVEDAD_CLASSES[data.gravedad] ?? 'sin-leve'
  const reparado = siniestroFueReparado(data, partes)
  return (
    <>
      <div className="tl-header-row">
        <p className="tl-title">Siniestro declarado</p>
        <span className={`tl-badge ${cls}`}>{SINIESTRO_GRAVEDAD_LABELS[data.gravedad]}</span>
      </div>
      {data.descripcion && <p className="tl-desc">{data.descripcion}</p>}
      <p className="tl-km">{reparado ? 'Reparado' : 'Sin reparar'}</p>
    </>
  )
}

function TransferCard({ data }: { data: TransferenciaVehiculo }) {
  return (
    <>
      <div className="tl-header-row">
        <p className="tl-title">Transferencia de dominio</p>
        <span className="tl-badge vtv-ok">NFT</span>
      </div>
      <p className="tl-desc">
        De <code>{shortAddress(data.from)}</code> a <code>{shortAddress(data.to)}</code>
      </p>
      {data.txHash ? (
        <p className="tl-km">
          <a href={`https://sepolia.etherscan.io/tx/${data.txHash}`} target="_blank" rel="noreferrer">
            Ver transacción
          </a>
        </p>
      ) : null}
    </>
  )
}

function TimelineItem({ event, partes }: { event: TimelineEvent; partes: Parte[] }) {
  const config = {
    service:   { letter: 'S', cls: 'dot-service' },
    vtv:       { letter: 'V', cls: 'dot-vtv'     },
    siniestro: { letter: '!', cls: 'dot-sin'     },
    transfer:  { letter: 'T', cls: 'dot-origin'  },
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
        {event.kind === 'siniestro' && <SiniestroCard data={event.data as RegistroSiniestro} partes={partes} />}
        {event.kind === 'transfer'  && <TransferCard  data={event.data as TransferenciaVehiculo} />}
      </div>
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────

type PublicViewProps = {
  consultaSignal?: number
  pendingSearchVin?: string | null
  onPendingSearchVinHandled?: () => void
  connected?: boolean
  walletLinked?: boolean
  role?: Role | null
  detecting?: boolean
  wrongNetwork?: boolean
  walletAddress?: string
  onGoToPanel?: (vin?: string) => void
  onGoToMisAutos?: () => void
  onGoToMisAutosWithVin?: (vin: string) => void
  onGoToTransfer?: (vin: string) => void
  onConnectWallet?: () => void
  onSwitchNetwork?: () => void | Promise<void>
}

export function PublicView({
  consultaSignal = 0,
  pendingSearchVin = null,
  onPendingSearchVinHandled,
  connected = false,
  walletLinked = false,
  role = null,
  detecting = false,
  wrongNetwork = false,
  walletAddress = '',
  onGoToPanel,
  onGoToMisAutos,
  onGoToMisAutosWithVin,
  onGoToTransfer,
  onConnectWallet,
  onSwitchNetwork,
}: PublicViewProps) {
  const [vin, setVin] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [qrReceiveMode, setQrReceiveMode] = useState(false)
  const [relayVin, setRelayVin] = useState<string | null>(null)
  const [partsRefreshKey, setPartsRefreshKey] = useState(0)
  const [companionSession, setCompanionSession] = useState(
    () => isMobileDevice() && isCompanionScanMode(),
  )
  const [catalogFilters, setCatalogFilters] = useState<DemoCatalogFilterState>({
    seal: 'all',
    km: 'all',
  })
  const lookup = usePublicVehicleLookup()
  const { data: rawData, error, loading, loadingVin, refreshing } = lookup
  const chainActivities = useChainActivities()
  const data = useMemo(
    () => (rawData ? normalizePublicVehicleRecord(rawData) : null),
    [rawData],
  )
  const [partes, setPartes] = useState<Parte[]>([])
  const [transferencias, setTransferencias] = useState<TransferenciaVehiculo[]>([])
  useEffect(() => {
    if (!data || !hasVehiclePartsContract) {
      setPartes([])
      return
    }
    let cancelled = false
    getPartesVehiculo(data.tokenId)
      .then((r) => { if (!cancelled) setPartes(r) })
      .catch(() => { if (!cancelled) setPartes([]) })
    return () => { cancelled = true }
  }, [data?.tokenId, partsRefreshKey])
  useEffect(() => {
    if (!data) {
      setTransferencias([])
      return
    }
    let cancelled = false
    getTransferenciasVehiculo(data.tokenId)
      .then((historial) => { if (!cancelled) setTransferencias(historial) })
      .catch(() => { if (!cancelled) setTransferencias([]) })
    return () => { cancelled = true }
  }, [data?.tokenId, data?.source])
  const openVinRef = useRef<string | null>(null)
  openVinRef.current = data?.info.vin ?? null
  const isMobile = isMobileDevice()
  const showPhoneCompanion = connected && !wrongNetwork && prefersPhoneCompanion()
  const canScanFromSearch = isMobile || canUseCameraScan()
  const companionOperative = Boolean(role && role !== 'none')
  const walletEsPropietaria = Boolean(
    connected && walletAddress && data && isSameWalletAddress(walletAddress, data.ownerAddress),
  )

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
    if (!pendingSearchVin) return
    setVin(pendingSearchVin)
    void lookup.search(pendingSearchVin)
    onPendingSearchVinHandled?.()
  }, [pendingSearchVin, lookup.search, onPendingSearchVinHandled])

  useEffect(() => {
    if (!data) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [data?.info.vin])

  useEffect(() => {
    return subscribeVehicleChainUpdates(({ vin, reason }) => {
      const openVin = openVinRef.current
      if (!openVin || normalizeVin(vin) !== normalizeVin(openVin)) return
      void lookup.refresh(vin)
      if (reason === 'autopartes') setPartsRefreshKey(k => k + 1)
      if (reason === 'transfer') {
        void getTransferenciasVehiculo(data?.tokenId ?? 0n)
          .then(setTransferencias)
          .catch(() => setTransferencias([]))
      }
    })
  }, [data?.tokenId, lookup.refresh])

  const vinFilteredDemos = useMemo(() => filterDemoVehicles(vin), [vin])
  const filteredDemos = useMemo(
    () => applyDemoCatalogFilters(vinFilteredDemos, catalogFilters),
    [vinFilteredDemos, catalogFilters],
  )
  const showCatalogFilters = DEMO_VEHICLES.length > DEMO_CATALOG_FILTER_THRESHOLD
  const transferenciasVisibles = useMemo(() => {
    if (!data) return []

    const byTx = new Map<string, TransferenciaVehiculo>()
    for (const tx of transferencias) {
      byTx.set(tx.txHash || `${tx.from}-${tx.to}-${tx.blockNumber}`, tx)
    }

    for (const entry of chainActivities) {
      if (
        entry.kind !== 'transfer_nft' ||
        entry.status !== 'confirmed' ||
        normalizeVin(entry.vin ?? '') !== normalizeVin(data.info.vin) ||
        !entry.counterparty
      ) {
        continue
      }

      const localTx: TransferenciaVehiculo = {
        from: entry.walletAddress,
        to: entry.counterparty,
        tokenId: data.tokenId,
        blockNumber: entry.blockNumber ?? 0,
        timestamp: Math.floor(entry.at / 1000),
        txHash: entry.txHash ?? '',
      }
      byTx.set(localTx.txHash || `${localTx.from}-${localTx.to}-${localTx.blockNumber}`, localTx)
    }

    return [...byTx.values()].sort((a, b) => (b.timestamp ?? b.blockNumber) - (a.timestamp ?? a.blockNumber))
  }, [chainActivities, data, transferencias])

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

  const timeline = data ? buildTimeline(data.services, data.siniestros, data.vtv, transferenciasVisibles) : []

  // ── Search state ────────────────────────────────────────────────────────────

  if (!data) {
    return (
      <div className="public-view pv-search-state">
        <div className="pv-hero-bg" aria-hidden />
        <div className="pv-layout">
          <header className="pv-hero pv-hero--compact">
            <h1 className="pv-title">Pasaporte vehicular</h1>
            <p className="pv-subtitle pv-subtitle--compact">Buscá por VIN o escaneá el QR. Sin wallet para consultar.</p>
          </header>

          {!relayVin ? (
            <VinSearchPanel
              vin={vin}
              loading={loading}
              error={error}
              scanEnabled={canScanFromSearch}
              onVinChange={(value) => {
                setVin(value)
                lookup.reset()
              }}
              onSearch={() => buscar()}
              onScan={openLocalScanner}
            />
          ) : null}

          {!relayVin && (loading ? (
            <SearchLoadingSkeleton />
          ) : (
            <section className="pv-catalog pv-catalog--compact" aria-label="Vehiculos de demostracion">
              <h2 className="pv-catalog-title">Ejemplos demo</h2>

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
          ))}

          {!walletLinked ? (
            <MisVehiculosHomeCard
              walletLinked={walletLinked}
              wrongNetwork={wrongNetwork}
              onConnectWallet={onConnectWallet}
              onGoToMisAutos={onGoToMisAutos}
            />
          ) : null}

          {isMobile && getRememberedWalletHint() ? (
            <MobileLinkBanner connectedAddress={connected ? walletAddress : undefined} />
          ) : null}

          {walletLinked ? (
            <ConnectedWalletStrip
              role={role}
              detecting={detecting}
              wrongNetwork={wrongNetwork}
              onGoToPanel={handleGoToPanel}
              onGoToMisAutos={onGoToMisAutos}
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
            <SourcePill data={data} syncing={refreshing} />
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
          <VehicleHeroCard
            data={data}
            connected={connected}
            role={role}
            onGoToPanel={connected ? handleGoToPanel : undefined}
            partsRefreshKey={partsRefreshKey}
          />
        </div>
        <SealQualityCard data={data} />
        <OracleEvidencePanel tokenId={data.tokenId} />

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
            isOwner={walletEsPropietaria}
            onGoToPanel={handleGoToPanel}
            onGoToMisAutos={onGoToMisAutos}
            onGoToTransfer={onGoToTransfer}
            onConnectWallet={onConnectWallet}
          />
        ) : null}

        {connected && walletEsPropietaria && onGoToTransfer && !isMobile ? (
          <button
            type="button"
            className="pv-connected-banner__btn pv-connected-banner__btn--inline"
            onClick={() => onGoToTransfer(data.info.vin)}
          >
            Transferir
          </button>
        ) : null}

        {connected && !walletEsPropietaria && onGoToMisAutosWithVin && role === 'none' && !isMobile ? (
          <button
            type="button"
            className="pv-connected-banner__btn pv-connected-banner__btn--inline"
            onClick={() => onGoToMisAutosWithVin(data.info.vin)}
          >
            Ver en mis vehículos
          </button>
        ) : null}

        {connected && !walletEsPropietaria && onGoToPanel && role && role !== 'none' && !isMobile ? (
          <button type="button" className="pv-connected-banner__btn pv-connected-banner__btn--inline" onClick={handleGoToPanel}>
            Operar este vehículo
          </button>
        ) : null}

        <h3 className="pv-section-title">Historial de eventos</h3>

        {timeline.length === 0 ? (
          <div className="pv-empty">Sin eventos registrados</div>
        ) : (
          <div className="timeline">
            {timeline.map((event, i) => (
              <TimelineItem event={event} partes={partes} key={i} />
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

      <VinQrScanner
        open={qrOpen}
        onClose={closeQrScanner}
        onDetected={handleQrDetected}
        receiveMode={qrReceiveMode}
      />
    </div>
  )
}
