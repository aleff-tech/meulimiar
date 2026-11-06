import { describe, expect, it } from 'vitest';
import { calculateBmi } from './bmi';

describe('calculateBmi', () => {
  it('converts centimetres to metres and rounds BMI to one decimal place', () => {
    expect(calculateBmi(70, 175)).toBe(22.9);
  });

  it('rejects non-positive body measurements', () => {
    expect(() => calculateBmi(0, 175)).toThrow(RangeError);
    expect(() => calculateBmi(70, 0)).toThrow(RangeError);
  });
});
