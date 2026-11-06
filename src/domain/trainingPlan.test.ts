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
      'easy',
      'long',
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

  it('rotates quality subtypes through an 8-week plan including recovery and taper weeks', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 30, weeksAvailable: 8 },
      paces,
    );
    const qualitySessions = plan.weeks.map((week) =>
      week.sessions.filter((session) => session.type === 'quality'),
    );

    expect(qualitySessions.every((sessions) => sessions.length === 1)).toBe(true);
    expect(qualitySessions.map((sessions) => sessions[0].qualityType)).toEqual([
      'threshold',
      'interval',
      'fartlek',
      'progressive',
      'threshold',
      'interval',
      'fartlek',
      'progressive',
    ]);
  });

  it.each([2, 3, 4, 7])(
    'preserves weekly totals and long-run shares after ordering %i sessions',
    (sessionsPerWeek) => {
      const targetShares = [
        [3, 0.2],
        [5, 0.25],
        [10, 0.3],
        [21.1, 0.35],
        [42.2, 0.4],
      ] as const;

      for (const [targetDistanceKm, longRunShare] of targetShares) {
        const plan = buildTrainingPlan(
          { ...baseProfile, targetDistanceKm, currentWeeklyKm: 20, sessionsPerWeek },
          paces,
        );

        expect(plan.weeks[0].sessions.find((session) => session.type === 'long')?.distanceKm).toBe(
          20 * longRunShare,
        );
        for (const week of plan.weeks) {
          const sum = week.sessions.reduce((total, session) => total + session.distanceKm, 0);
          expect(Math.round(sum * 100)).toBe(Math.round(week.weeklyDistanceKm * 100));
        }
        if (sessionsPerWeek >= 3) {
          expect(plan.weeks[0].sessions[0].type).toBe('quality');
          expect(plan.weeks[0].sessions[1].type).toBe('easy');
        }
      }
    },
  );

  it('partitions a quality session into easy warm-up, main work, and easy cool-down', () => {
    const plan = buildTrainingPlan(baseProfile, paces);
    const quality = plan.weeks[0].sessions[0];

    expect(quality.qualityType).toBe('threshold');
    expect(quality.warmupDistanceKm).toBe(1.66);
    expect(quality.warmupDurationSeconds).toBe(598);
    expect(quality.mainDistanceKm).toBe(1.51);
    expect(quality.cooldownDistanceKm).toBe(0.83);
    expect(quality.cooldownDurationSeconds).toBe(299);
    expect(
      quality.warmupDistanceKm + quality.mainDistanceKm + quality.cooldownDistanceKm,
    ).toBe(quality.distanceKm);
  });

  it('keeps easy and long phase durations within one second of five-minute targets', () => {
    const plan = buildTrainingPlan(baseProfile, paces);
    const easy = plan.weeks[0].sessions.find((session) => session.type === 'easy');
    const long = plan.weeks[0].sessions.find((session) => session.type === 'long');

    expect(Math.abs((easy?.warmupDurationSeconds ?? 0) - 300)).toBeLessThanOrEqual(1);
    expect(Math.abs((easy?.cooldownDurationSeconds ?? 0) - 300)).toBeLessThanOrEqual(1);
    expect(Math.abs((long?.warmupDurationSeconds ?? 0) - 300)).toBeLessThanOrEqual(1);
    expect(Math.abs((long?.cooldownDurationSeconds ?? 0) - 300)).toBeLessThanOrEqual(1);
  });

  it('scales easy phases when a short session cannot fit the phase targets', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 1, sessionsPerWeek: 1, weeksAvailable: 4 },
      paces,
    );
    const session = plan.weeks[0].sessions[0];

    expect(session.warmupDistanceKm + session.cooldownDistanceKm).toBeLessThanOrEqual(
      session.distanceKm / 2,
    );
    expect(plan.warnings.some((warning) => /fase/i.test(warning))).toBe(true);
  });

  it('changes an ineligible quality session to easy without increasing its allocated distance', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 10, sessionsPerWeek: 4 },
      paces,
    );
    const session = plan.weeks[0].sessions[0];

    expect(session.type).toBe('easy');
    expect(session.qualityType).toBeUndefined();
    expect(session.distanceKm).toBe(2);
    expect(plan.warnings.some((warning) => /qualidade.*leve/i.test(warning))).toBe(true);
  });

  it('uses the right pace and workout format for each quality subtype', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 30, weeksAvailable: 8 },
      paces,
    );
    const qualitySessions = plan.weeks.slice(0, 4).map((week) =>
      week.sessions.find((session) => session.type === 'quality'),
    );

    expect(qualitySessions.map((session) => session?.paceSecondsPerKm)).toEqual([
      paces.thresholdSecondsPerKm,
      paces.intervalSecondsPerKm,
      paces.intervalSecondsPerKm,
      paces.thresholdSecondsPerKm,
    ]);
    expect(qualitySessions[0]?.description).toMatch(/limiar/i);
    expect(qualitySessions[1]?.description).toMatch(/tiro/i);
    expect(qualitySessions[2]?.description).toMatch(/fartlek/i);
    expect(qualitySessions[3]?.description).toMatch(/progressivo/i);
  });

  it('fits concrete threshold blocks and recoveries to the allocated main distance', () => {
    const plan = buildTrainingPlan(baseProfile, paces);
    const threshold = plan.weeks[0].sessions[0];

    expect(threshold.description).toContain('2 × 3 min a 4:45 min/km (0.63 km por bloco)');
    expect(threshold.description).toContain(
      '1 × 1 min de recuperação leve a 6:00 min/km (0.16 km)',
    );
    expect(threshold.description).toContain('0.09 km leve');
    expect(Math.round((2 * 0.63 + 0.16 + 0.09) * 100)).toBe(
      Math.round(threshold.mainDistanceKm * 100),
    );
  });

  it('fits concrete interval repetitions and recoveries to the allocated main distance', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 30, weeksAvailable: 8 },
      paces,
    );
    const intervals = plan.weeks[1].sessions[0];

    expect(intervals.description).toContain('8 × 300 m a 4:25 min/km (0.30 km por repetição)');
    expect(intervals.description).toContain(
      '7 × 200 m de recuperação leve a 6:00 min/km (0.20 km)',
    );
    expect(intervals.description).toContain('0.01 km leve');
    expect(Math.round((8 * 0.3 + 7 * 0.2 + 0.01) * 100)).toBe(
      Math.round(intervals.mainDistanceKm * 100),
    );
  });

  it('fits complete one-minute fartlek cycles and easy running to the allocated main distance', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 30, weeksAvailable: 8 },
      paces,
    );
    const fartlek = plan.weeks[2].sessions[0];

    expect(fartlek.description).toContain(
      '10 ciclos de 1 min rápido a 4:25 min/km (0.22 km por ciclo) + 1 min leve a 6:00 min/km (0.16 km por ciclo)',
    );
    expect(fartlek.description).toContain('0.32 km leve extra');
    expect(Math.round((10 * (0.22 + 0.16) + 0.32) * 100)).toBe(
      Math.round(fartlek.mainDistanceKm * 100),
    );
  });

  it('uses the rounded easy-threshold midpoint only for the progressive middle segment', () => {
    const plan = buildTrainingPlan(
      { ...baseProfile, currentWeeklyKm: 30, weeksAvailable: 8 },
      paces,
    );
    const progressive = plan.weeks[3].sessions.find((session) => session.type === 'quality');

    expect(progressive?.description).toContain('5:23 min/km');
  });

  it('keeps one- and two-session plans quality-free while adding phases to every feasible session', () => {
    for (const sessionsPerWeek of [1, 2]) {
      const plan = buildTrainingPlan({ ...baseProfile, sessionsPerWeek }, paces);

      for (const session of plan.weeks[0].sessions) {
        expect(session.type).not.toBe('quality');
        expect(session.warmupDistanceKm).toBeGreaterThan(0);
        expect(session.cooldownDistanceKm).toBeGreaterThan(0);
        expect(
          Math.round(
            (session.warmupDistanceKm + session.mainDistanceKm + session.cooldownDistanceKm) * 100,
          ),
        ).toBe(Math.round(session.distanceKm * 100));
      }
    }
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
