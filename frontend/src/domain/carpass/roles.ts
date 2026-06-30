export type Role = 'admin' | 'registrador' | 'mecanico' | 'aseguradora' | 'inspector' | 'none'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  registrador: 'Concesionaria',
  mecanico: 'Taller',
  aseguradora: 'Aseguradora',
  inspector: 'Inspector VTV',
  none: 'Sin rol',
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'admin',
  registrador: 'registrador',
  mecanico: 'taller',
  aseguradora: 'aseguradora',
  inspector: 'inspector',
  none: 'none',
}

export type OperativeRole = Exclude<Role, 'none'>

export const ROLE_DESCRIPTIONS: Record<OperativeRole, string> = {
  admin: 'Gestioná vehículos, roles y todas las operaciones del pasaporte digital.',
  registrador: 'Dá de alta vehículos nuevos con kilometraje inicial en 0 km.',
  mecanico: 'Registrá services y actualizá el kilometraje verificable on-chain.',
  aseguradora: 'Declará siniestros, daños y estado de reparación.',
  inspector: 'Certificá revisiones técnicas vehiculares (VTV) y vencimientos.',
}

export const ROLE_CAPABILITIES: Record<OperativeRole, string[]> = {
  admin: ['Alta de vehículos', 'Gestión de roles', 'Vistas operativas'],
  registrador: ['Emitir pasaporte ERC-721', 'VIN único por token', 'Propietario inicial'],
  mecanico: ['Cargar services', 'Validar kilometraje creciente', 'Historial inmutable'],
  aseguradora: ['Registrar siniestros', 'Gravedad y costos', 'Estado de reparación'],
  inspector: ['Resultado VTV', 'Fecha de vencimiento', 'Sello de calidad'],
}
