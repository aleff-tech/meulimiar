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

export function getBmiTrainingGuidance(bmi: number): string | null {
  if (bmi < 30) return null;

  return 'Em adultos, IMC igual ou acima de 30 pode indicar a faixa de obesidade. O IMC é um indicador de triagem, não um diagnóstico nem uma medida isolada do risco de lesão. Se você for adulto e esse for o seu caso, considere fazer os treinos em esforço mais leve do que o indicado e manter uma progressão mais conservadora; atividades de menor impacto podem ser uma alternativa. Um profissional de saúde ou de educação física pode ajudar a adaptar a carga. Isso não garante evitar lesões e o plano não é ajustado automaticamente. Em menores de 18 anos, a interpretação do IMC é diferente.';
}
