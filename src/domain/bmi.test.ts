import { describe, expect, it } from 'vitest';
import { calculateBmi, getBmiTrainingGuidance } from './bmi';

describe('calculateBmi', () => {
  it('converts centimetres to metres and rounds BMI to one decimal place', () => {
    expect(calculateBmi(70, 175)).toBe(22.9);
  });

  it('rejects non-positive body measurements', () => {
    expect(() => calculateBmi(0, 175)).toThrow(RangeError);
    expect(() => calculateBmi(70, 0)).toThrow(RangeError);
  });
});

describe('getBmiTrainingGuidance', () => {
  it('returns careful adult guidance at and above BMI 30', () => {
    const guidance = getBmiTrainingGuidance(30);

    expect(guidance).toContain('Em adultos');
    expect(guidance).toContain('não um diagnóstico');
    expect(guidance).toContain('risco de lesão');
    expect(guidance).toContain('progressão mais conservadora');
    expect(guidance).toContain('esforço mais leve do que o indicado');
    expect(guidance).toContain('menor impacto');
    expect(guidance).toContain('profissional');
    expect(guidance).toContain('não é ajustado automaticamente');
    expect(guidance).toContain('menores de 18 anos');
    expect(getBmiTrainingGuidance(32.7)).toBe(guidance);
  });

  it('returns no guidance below BMI 30', () => {
    expect(getBmiTrainingGuidance(29.9)).toBeNull();
  });
});
