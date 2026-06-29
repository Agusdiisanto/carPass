import type { SealState } from './seal'

export type DemoVehicle = {
  vin: string
  label: string
  seal: SealState
  reason: string
}

export const DEMO_VEHICLES: DemoVehicle[] = [
  { vin: '1HGBH41JXMN109186', label: 'Honda Civic', seal: 0, reason: 'Services + VTV vigente' },
  { vin: '3FADP4EJ8FM123456', label: 'Ford Focus', seal: 1, reason: 'Sin VTV registrada' },
  { vin: '1G1BE5SM1H7123456', label: 'Chevrolet Cruze', seal: 1, reason: 'VTV con observaciones' },
  { vin: '2T1BURHE0JC043821', label: 'Toyota Corolla', seal: 2, reason: 'Siniestro grave' },
  { vin: '8A1FB1AB2JT123456', label: 'Renault Logan', seal: 2, reason: 'VTV rechazada' },
]
