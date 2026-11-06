export function calculateBmi(weightKg: number, heightCm: number): number {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg <= 0 ||
    heightCm <= 0
  ) {
    throw new RangeError('Peso e altura devem ser números positivos.');
  }

  const heightMetres = heightCm / 100;
  return Math.round((weightKg / heightMetres ** 2) * 10) / 10;
}
