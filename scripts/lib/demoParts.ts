const GRABADO_PREFIXES = ["MOT", "CAJ", "PDI", "PDD", "CAP", "BAU"] as const;

/** Numeros de grabado deterministicos por VIN para seed idempotente. */
export function demoNumerosGrabado(vin: string): string[] {
  const suffix = vin.slice(-6).toUpperCase();
  return GRABADO_PREFIXES.map((prefix, index) => `${prefix}-${suffix}-${index + 1}`);
}

export function partesYaRegistradas(partes: Array<{ numeroGrabado: string }>): boolean {
  return partes.some((parte) => String(parte.numeroGrabado ?? "").trim().length > 0);
}
