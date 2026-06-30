import { findDemoVehicle } from './demoVehicles'

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const COMMONS_TIMEOUT_MS = 5000
const CACHE_STORAGE_KEY = 'carpass_vehicle_media_v2'

export type VehicleMediaInput = {
  vin: string
  marca: string
  modelo: string
  anio: number | string
}

/** Aclaracion visible cuando hay foto: referencia de modelo, no del VIN consultado. */
export function getVehicleMediaDisclaimer({
  marca,
  modelo,
  anio,
}: Pick<VehicleMediaInput, 'marca' | 'modelo' | 'anio'>): string {
  const label = [marca, modelo, String(anio)].join(' ').trim()
  return `Imagen ilustrativa del ${label}. No corresponde al vehiculo registrado en este VIN.`
}

const memoryCache = new Map<string, string | null>()

function mediaCacheKey({ marca, modelo, anio }: VehicleMediaInput): string {
  return [marca, modelo, String(anio)].join('|').toLowerCase().trim()
}

function readStorageCache(): Record<string, string | null> {
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string | null>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function writeStorageCache(key: string, value: string | null) {
  try {
    const current = readStorageCache()
    current[key] = value
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(current))
  } catch {
    // sessionStorage no disponible.
  }
}

function getCached(key: string): string | null | undefined {
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null
  const stored = readStorageCache()[key]
  if (stored !== undefined) {
    memoryCache.set(key, stored)
    return stored
  }
  return undefined
}

function setCached(key: string, value: string | null) {
  memoryCache.set(key, value)
  writeStorageCache(key, value)
}

function buildCommonsSearchQuery({ marca, modelo, anio }: VehicleMediaInput): string {
  return `${anio} ${marca} ${modelo} automobile`.replace(/\s+/g, ' ').trim()
}

type CommonsPage = {
  imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string }>
}

async function fetchCommonsImage(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '10',
    gsrnamespace: '6',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '640',
  })

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), COMMONS_TIMEOUT_MS)

  try {
    const response = await fetch(`${COMMONS_API}?${params.toString()}`, {
      signal: controller.signal,
    })
    if (!response.ok) return null

    const json = (await response.json()) as {
      query?: { pages?: Record<string, CommonsPage> }
    }

    const pages = json.query?.pages
    if (!pages) return null

    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0]
      if (!info) continue
      const mime = info.mime ?? ''
      if (mime && !mime.startsWith('image/')) continue
      return info.thumburl ?? info.url ?? null
    }

    return null
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function resolveVehicleImageUrl(input: VehicleMediaInput): Promise<string | null> {
  const demo = findDemoVehicle(input.vin)
  if (demo?.imageUrl) return demo.imageUrl

  const key = mediaCacheKey(input)
  const cached = getCached(key)
  if (cached !== undefined) return cached

  const query = buildCommonsSearchQuery(input)
  const url = await fetchCommonsImage(query)
  setCached(key, url)
  return url
}
