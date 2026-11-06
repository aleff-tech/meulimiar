import { describe, expect, it } from 'vitest';
import { parseRunnerProfile, type RunnerFormValues } from './profile';

const validValues: RunnerFormValues = {
  targetDistanceKm: '10',
  fiveKmHours: '0',
  fiveKmMinutes: '22',
  fiveKmSeconds: '30',
  weightKg: '70',
  heightCm: '175',
  currentWeeklyKm: '30',
  sessionsPerWeek: '4',
  weeksAvailable: '12',
  preference: 'light',
};

describe('parseRunnerProfile', () => {
  it('converts valid form values into a typed running profile', () => {
    expect(parseRunnerProfile(validValues)).toEqual({
      ok: true,
      value: {
        targetDistanceKm: 10,
        fiveKmTimeSeconds: 1350,
        weightKg: 70,
        heightCm: 175,
        currentWeeklyKm: 30,
        sessionsPerWeek: 4,
        weeksAvailable: 12,
        preference: 'light',
      },
    });
  });

  it('rejects time components outside the clock range', () => {
    const result = parseRunnerProfile({ ...validValues, fiveKmMinutes: '60' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.fiveKmMinutes).toBeTruthy();
    }
  });

  it('rejects blank and non-finite numeric values', () => {
    const result = parseRunnerProfile({
      ...validValues,
      heightCm: '',
      currentWeeklyKm: 'Infinity',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.heightCm).toBeTruthy();
      expect(result.errors.currentWeeklyKm).toBeTruthy();
    }
  });

  it('rejects targets, training frequency, and cycle lengths outside the supported ranges', () => {
    const result = parseRunnerProfile({
      ...validValues,
      targetDistanceKm: '4',
      sessionsPerWeek: '8',
      weeksAvailable: '3',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.targetDistanceKm).toBeTruthy();
      expect(result.errors.sessionsPerWeek).toBeTruthy();
      expect(result.errors.weeksAvailable).toBeTruthy();
    }
  });

  it('accepts the lowest supported training values', () => {
    expect(
      parseRunnerProfile({
        ...validValues,
        targetDistanceKm: '3',
        fiveKmMinutes: '20',
        fiveKmSeconds: '0',
        weightKg: '20',
        heightCm: '100',
        currentWeeklyKm: '1',
        sessionsPerWeek: '1',
        weeksAvailable: '4',
        preference: 'aggressive',
      }),
    ).toMatchObject({
      ok: true,
      value: {
        targetDistanceKm: 3,
        currentWeeklyKm: 1,
        sessionsPerWeek: 1,
        weeksAvailable: 4,
        preference: 'aggressive',
      },
    });
  });
});
