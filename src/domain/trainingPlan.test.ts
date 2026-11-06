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
      22.1,
      17.7,
      23.2,
      24.4,
      25.6,
      15.4,
    ]);
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

  it('keeps the weekly distance equal to the sum of rounded sessions', () => {
    const plan = buildTrainingPlan({ ...baseProfile, sessionsPerWeek: 7 }, paces);

    for (const week of plan.weeks) {
      const sessionDistance = week.sessions.reduce((sum, session) => sum + session.distanceKm, 0);
      expect(Math.round(sessionDistance * 10) / 10).toBe(week.weeklyDistanceKm);
      expect(week.sessions.every((session) => session.distanceKm > 0)).toBe(true);
    }
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

    expect(plan.warnings.length).toBeGreaterThan(0);
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

    expect(plan.warnings).toHaveLength(0);
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
