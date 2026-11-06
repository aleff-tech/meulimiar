import { describe, expect, it } from 'vitest';
import { parseRunnerProfile, type RunnerFormValues } from './profile';

const validValues: RunnerFormValues = {
  targetDistanceKm: '10',
  goalTimeHours: '0',
  goalTimeMinutes: '45',
  goalTimeSeconds: '30',
  weightKg: '70',
  heightCm: '175',
  currentWeeklyKm: '30',
  sessionsPerWeek: '4',
  raceDate: '2026-03-10',
  adultConfirmed: true,
};

describe('parseRunnerProfile', () => {
  it('converts valid form values into a typed running profile', () => {
    expect(parseRunnerProfile(validValues, new Date(2026, 1, 20))).toEqual({
      ok: true,
      value: {
        targetDistanceKm: 10,
        goalTimeSeconds: 2730,
        weightKg: 70,
        heightCm: 175,
        currentWeeklyKm: 30,
        sessionsPerWeek: 4,
        raceDate: '2026-03-10',
        adultConfirmed: true,
      },
    });
  });

  it('rejects goal-time components outside the clock range and non-positive totals', () => {
    const invalidHour = parseRunnerProfile({ ...validValues, goalTimeHours: '24' }, new Date(2026, 1, 20));
    const invalidMinute = parseRunnerProfile({ ...validValues, goalTimeMinutes: '60' }, new Date(2026, 1, 20));
    const invalidSecond = parseRunnerProfile({ ...validValues, goalTimeSeconds: '60' }, new Date(2026, 1, 20));
    const zeroTotal = parseRunnerProfile(
      { ...validValues, goalTimeHours: '0', goalTimeMinutes: '0', goalTimeSeconds: '0' },
      new Date(2026, 1, 20),
    );

    expect(invalidHour.ok).toBe(false);
    expect(invalidMinute.ok).toBe(false);
    expect(invalidSecond.ok).toBe(false);
    expect(zeroTotal.ok).toBe(false);
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

  it('rejects malformed, past, and beyond-24-week race dates', () => {
    const malformedDate = parseRunnerProfile({ ...validValues, raceDate: '2026-13-40' }, new Date(2026, 1, 20));
    const pastDate = parseRunnerProfile({ ...validValues, raceDate: '2026-02-19' }, new Date(2026, 1, 20));
    const beyond24Weeks = parseRunnerProfile({ ...validValues, raceDate: '2026-08-20' }, new Date(2026, 1, 20));

    expect(malformedDate.ok).toBe(false);
    expect(pastDate.ok).toBe(false);
    expect(beyond24Weeks.ok).toBe(false);
  });

  it('accepts a race date inside four weeks and defaults adultConfirmed to false', () => {
    expect(
      parseRunnerProfile({
        ...validValues,
        targetDistanceKm: '3',
        goalTimeMinutes: '20',
        goalTimeSeconds: '0',
        weightKg: '20',
        heightCm: '100',
        currentWeeklyKm: '1',
        sessionsPerWeek: '1',
        raceDate: '2026-02-25',
        adultConfirmed: undefined,
      }, new Date(2026, 1, 20)),
    ).toMatchObject({
      ok: true,
      value: {
        targetDistanceKm: 3,
        currentWeeklyKm: 1,
        sessionsPerWeek: 1,
        raceDate: '2026-02-25',
        adultConfirmed: false,
      },
    });
  });
});
