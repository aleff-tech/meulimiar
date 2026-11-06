import { describe, expect, it } from 'vitest';
import { calculatePaces } from './paces';
import type { RunnerProfile } from './profile';
import { buildTrainingPlan } from './trainingPlan';

const baseProfile: RunnerProfile = {
  targetDistanceKm: 10,
  fiveKmTimeSeconds: 1350,
  weightKg: 70,
  heightCm: 175,
  currentWeeklyKm: 20,
  sessionsPerWeek: 4,
  weeksAvailable: 8,
  preference: 'light',
};

const paces = calculatePaces(baseProfile.fiveKmTimeSeconds);

describe('buildTrainingPlan', () => {
  it('creates the selected number of weeks and sessions', () => {
    const plan = buildTrainingPlan(baseProfile, paces);

    expect(plan.weeks).toHaveLength(8);
    expect(plan.weeks.every((week) => week.sessions.length === 4)).toBe(true);
    expect(plan.weeks[0].sessions.map((session) => session.type)).toEqual([
      'quality',
      'long',
      'easy',
      'easy',
    ]);
  });

  it('caps light growth, cuts back, and tapers from the preceding peak', () => {
    const plan = buildTrainingPlan(baseProfile, paces);

    expect(plan.weeks.map((week) => week.weeklyDistanceKm)).toEqual([
      20,
      21,
      22.05,
      17.64,
      23.15,
      24.3,
      25.51,
      15.3,
    ]);
  });

  it.each([
    ['light', 0.05],
    ['aggressive', 0.08],
  ] as const)('respects %s growth, recovery, and taper limits from a 1 km base', (
    preference,
    growthRate,
  ) => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 1, sessionsPerWeek: 1, weeksAvailable: 8, preference },
      paces,
    );
    let peak = plan.weeks[0].weeklyDistanceKm;

    expect(plan.weeks[1].weeklyDistanceKm).toBe(1 + growthRate);

    for (const week of plan.weeks.slice(1)) {
      const currentHundredths = Math.round(week.weeklyDistanceKm * 100);

      if (week.week === 8) {
        expect(currentHundredths).toBeLessThanOrEqual(Math.floor(peak * 0.6 * 100 + 1e-8));
      } else if (week.week % 4 === 0) {
        expect(currentHundredths).toBeLessThanOrEqual(Math.floor(peak * 0.8 * 100 + 1e-8));
      } else {
        expect(currentHundredths).toBeLessThanOrEqual(
          Math.floor(peak * (1 + growthRate) * 100 + 1e-8),
        );
        peak = week.weeklyDistanceKm;
      }
    }
  });

  it('uses the entered weekly distance as the first week even at a low base', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 1, sessionsPerWeek: 1, weeksAvailable: 4 },
      paces,
    );

    expect(plan.weeks[0].weeklyDistanceKm).toBe(1);
    expect(plan.weeks[0].sessions).toHaveLength(1);
    expect(plan.weeks[0].sessions[0].type).toBe('easy');
  });

  it('uses only easy and long-easy sessions when training twice per week', () => {
    const plan = buildTrainingPlan({ ...baseProfile, sessionsPerWeek: 2 }, paces);

    expect(plan.weeks[0].sessions.map((session) => session.type)).toEqual(['easy', 'long']);
  });

  it('rounds the long-run share down and assigns the remainder to an easy session', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, targetDistanceKm: 3, currentWeeklyKm: 1.01, sessionsPerWeek: 2 },
      paces,
    );
    const [easy, long] = plan.weeks[0].sessions;

    expect(easy.distanceKm).toBe(0.81);
    expect(long.distanceKm).toBe(0.2);
  });

  it('keeps the weekly distance equal to the sum of rounded sessions', () => {
    const plan = buildTrainingPlan({ ...baseProfile, sessionsPerWeek: 7 }, paces);

    for (const week of plan.weeks) {
      const sessionDistance = week.sessions.reduce((sum, session) => sum + session.distanceKm, 0);
      expect(Math.round(sessionDistance * 100)).toBe(Math.round(week.weeklyDistanceKm * 100));
      expect(week.sessions.every((session) => session.distanceKm >= 0)).toBe(true);
    }
  });

  it.each([
    [3, 20],
    [5, 25],
    [10, 30],
    [21.1, 35],
    [42.2, 40],
  ] as const)('uses the long-run share for a %s km target (expected %s km)', (
    targetDistanceKm,
    expectedLongRunKm,
  ) => {
    const plan = buildTrainingPlan(
      {
        ...baseProfile,
        targetDistanceKm,
        currentWeeklyKm: 100,
        sessionsPerWeek: 2,
        weeksAvailable: 6,
      },
      paces,
    );

    expect(plan.weeks[0].sessions.find((session) => session.type === 'long')?.distanceKm).toBe(
      expectedLongRunKm,
    );
  });

  it('warns when the longest planned long run is below 75% of the target', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, targetDistanceKm: 42.2, currentWeeklyKm: 1, sessionsPerWeek: 2, weeksAvailable: 4 },
      paces,
    );

    expect(plan.warnings.some((warning) => /longa/i.test(warning))).toBe(true);
  });

  it('warns when one weekly session means there is no long run', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, targetDistanceKm: 3, currentWeeklyKm: 20, sessionsPerWeek: 1, weeksAvailable: 6 },
      paces,
    );

    expect(plan.warnings).toContain(
      'Com uma sessão por semana, não é possível separar um treino longo das demais sessões; avalie se o volume planejado é adequado à distância da prova.',
    );
  });

  it('does not warn about long-run distance when a 3 km plan reaches the threshold', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, targetDistanceKm: 3, currentWeeklyKm: 20, sessionsPerWeek: 2, weeksAvailable: 6 },
      paces,
    );

    expect(plan.warnings.some((warning) => /longa/i.test(warning))).toBe(false);
  });

  it.each([
    [3, 5],
    [5, 5],
    [10, 7],
    [21.1, 11],
    [42.2, 15],
  ] as const)('warns when %i km has only %i weeks', (targetDistanceKm, weeksAvailable) => {
    const plan = buildTrainingPlan(
      { ...baseProfile, targetDistanceKm, weeksAvailable },
      paces,
    );

    expect(plan.warnings.some((warning) => /^o ciclo de/i.test(warning))).toBe(true);
  });

  it.each([
    [3, 6],
    [5, 6],
    [10, 8],
    [21.1, 12],
    [42.2, 16],
  ] as const)('does not warn when %i km has the recommended %i weeks', (
    targetDistanceKm,
    weeksAvailable,
  ) => {
    const plan = buildTrainingPlan(
      { ...baseProfile, targetDistanceKm, weeksAvailable },
      paces,
    );

    expect(plan.warnings.some((warning) => /^o ciclo de/i.test(warning))).toBe(false);
  });

  it('does not change the training schedule when only BMI inputs change', () => {
    const original = buildTrainingPlan(baseProfile, paces);
    const changedMeasurements = buildTrainingPlan(
      { ...baseProfile, weightKg: 120, heightCm: 200 },
      paces,
    );

    expect(changedMeasurements).toEqual(original);
  });
});
