import type { SealState } from './seal'
import { safeUpperCase } from './formatters'

export type DemoVehicle = {
  vin: string
  marca: string
  modelo: string
  anio: number
  color: string
  seal: SealState
  reason: string
  km: number
  services: number
  vtv: number
  siniestros: number
  /** Imagen curada (Wikimedia). Sin scraping en runtime. */
  imageUrl?: string
}

export const DEMO_VEHICLES: DemoVehicle[] = [
  {
    vin: '1HGBH41JXMN109186',
    marca: 'Honda',
    modelo: 'Civic',
    anio: 2022,
    color: 'Gris',
    seal: 0,
    reason: 'Services al dia y VTV vigente',
    km: 30_000,
    services: 3,
    vtv: 1,
    siniestros: 0,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Honda_Civic_Hybrid_%282022%2C_Europe%29_1X7A6072.jpg/960px-Honda_Civic_Hybrid_%282022%2C_Europe%29_1X7A6072.jpg',
  },
  {
    vin: '3FADP4EJ8FM123456',
    marca: 'Ford',
    modelo: 'Focus',
    anio: 2020,
    color: 'Rojo',
    seal: 1,
    reason: 'Sin VTV registrada',
    km: 30_000,
    services: 2,
    vtv: 0,
    siniestros: 0,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/2020_Ford_Focus_Active_X_Estate.jpg/960px-2020_Ford_Focus_Active_X_Estate.jpg',
  },
  {
    vin: '1G1BE5SM1H7123456',
    marca: 'Chevrolet',
    modelo: 'Cruze',
    anio: 2019,
    color: 'Blanco',
    seal: 1,
    reason: 'VTV con observaciones',
    km: 25_000,
    services: 1,
    vtv: 1,
    siniestros: 0,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Chevrolet_Cruze_J400_sedan_Red_Line_01_China_2019-03-14.jpg/960px-Chevrolet_Cruze_J400_sedan_Red_Line_01_China_2019-03-14.jpg',
  },
  {
    vin: '2T1BURHE0JC043821',
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2021,
    color: 'Negro',
    seal: 2,
    reason: 'Siniestro grave sin reparar',
    km: 10_000,
    services: 1,
    vtv: 1,
    siniestros: 1,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/TOYOTA_COROLLA_SEDAN_%28E210%29_China_%287%29.jpg/960px-TOYOTA_COROLLA_SEDAN_%28E210%29_China_%287%29.jpg',
  },
  {
    vin: '8A1FB1AB2JT123456',
    marca: 'Renault',
    modelo: 'Logan',
    anio: 2018,
    color: 'Azul',
    seal: 2,
    reason: 'VTV rechazada',
    km: 40_000,
    services: 1,
    vtv: 1,
    siniestros: 0,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/2023_Dacia_Logan_III_IMG_9671.jpg/960px-2023_Dacia_Logan_III_IMG_9671.jpg',
  },
]

export function findDemoVehicle(vin: string): DemoVehicle | undefined {
  return DEMO_VEHICLES.find((vehicle) => vehicle.vin === vin)
}

export function filterDemoVehicles(query: unknown): DemoVehicle[] {
  const q = safeUpperCase(query).trim()
  if (!q) return DEMO_VEHICLES

  return DEMO_VEHICLES.filter((vehicle) => {
    const haystack = [
      vehicle.vin,
      vehicle.marca,
      vehicle.modelo,
      vehicle.color,
      String(vehicle.anio),
      vehicle.reason,
    ]
      .join(' ')
      .toUpperCase()

    return haystack.includes(q) || vehicle.vin.includes(q)
  })
}
