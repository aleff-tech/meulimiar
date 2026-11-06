import { describe, expect, it } from 'vitest';
import { calculatePaces } from './paces';
import type { RunnerProfile } from './profile';
import { buildTrainingPlan } from './trainingPlan';

const today = new Date(2026, 0, 5);

const baseProfile: RunnerProfile = {
  targetDistanceKm: 10,
  fiveKmTimeSeconds: 1350,
  goalTimeSeconds: 45 * 60,
  weightKg: 70,
  heightCm: 175,
  currentWeeklyKm: 20,
  sessionsPerWeek: 4,
  raceDate: '2026-03-29',
  adultConfirmed: true,
};

function buildPlan(
  profile: RunnerProfile = baseProfile,
  planToday: Date = today,
) {
  return buildTrainingPlan(profile, calculatePaces(profile.fiveKmTimeSeconds), planToday);
}

describe('buildTrainingPlan', () => {
  it('creates a 12-week Monday-based calendar with the specified phase distribution', () => {
    const plan = buildPlan();
    const phaseCounts = plan.weeks.reduce<Record<string, number>>((counts, week) => {
      counts[week.phase] = (counts[week.phase] ?? 0) + 1;
      return counts;
    }, {});

    expect(plan.weeks).toHaveLength(12);
    expect(phaseCounts).toEqual({ base: 3, development: 3, specific: 5, taper: 1 });
    expect(plan.weeks[0]).toMatchObject({
      week: 1,
      phase: 'base',
      startDate: '2026-01-05',
      endDate: '2026-01-11',
    });
    expect(plan.weeks[11]).toMatchObject({
      week: 12,
      phase: 'taper',
      startDate: '2026-03-23',
      endDate: '2026-03-29',
    });
  });

  it.each([
    [1, '2026-01-11', ['taper']],
    [2, '2026-01-18', ['base', 'taper']],
    [3, '2026-01-25', ['base', 'base', 'taper']],
  ] as const)(
    'warns and avoids compensatory volume growth in a %i-week cycle',
    (_weeks, raceDate, expectedPhases) => {
      const plan = buildPlan({ ...baseProfile, raceDate });

      expect(plan.weeks.map((week) => week.phase)).toEqual(expectedPhases);
      expect(plan.warnings.some((warning) => /ciclo.*curto/i.test(warning))).toBe(true);
      expect(plan.warnings.some((warning) => /menos de quatro semanas/i.test(warning))).toBe(true);
      expect(
        plan.weeks
          .every((week) => week.weeklyDistanceKm <= baseProfile.currentWeeklyKm),
      ).toBe(true);
    },
  );

  it('limits growth to 5%, cuts back 20% in recovery weeks, and tapers to 60% of peak', () => {
    const plan = buildPlan();
    const distance = (weekNumber: number) =>
      (plan.weeks[weekNumber - 1]?.weeklyDistanceKm ?? -1) /
      (weekNumber === 12 ? 6 / 7 : 1);

    let peak = distance(1);
    for (let weekNumber = 2; weekNumber <= plan.weeks.length; weekNumber += 1) {
      if (weekNumber === plan.weeks.length) {
        expect(distance(weekNumber)).toBeLessThanOrEqual(peak * 0.6);
      } else if (weekNumber % 4 === 0) {
        expect(distance(weekNumber)).toBeLessThanOrEqual(peak * 0.8);
      } else {
        expect(distance(weekNumber)).toBeLessThanOrEqual(peak * 1.05);
        peak = distance(weekNumber);
      }
    }
  });

  it('warns about an ambitious goal and caps specific interval and progressive race-pace segments', () => {
    const profile = { ...baseProfile, goalTimeSeconds: 40 * 60 };
    const paces = calculatePaces(profile.fiveKmTimeSeconds);
    const plan = buildPlan(profile);
    const specificWeeks = plan.weeks.filter((week) => String(week.phase) === 'specific');
    const baseInterval = plan.weeks[1].sessions.find(
      (session) => session.qualityType === 'interval',
    );
    const interval = specificWeeks
      .flatMap((week) => week.sessions)
      .find((session) => session.qualityType === 'interval');
    const progressive = specificWeeks
      .flatMap((week) => week.sessions)
      .find((session) => session.qualityType === 'progressive');
    const intervalRacePaceSegments =
      interval?.segments.filter((segment) => String(segment.phase) === 'race-pace') ?? [];

    expect(plan.warnings.some((warning) => /meta.*ambiciosa/i.test(warning))).toBe(true);
    expect(intervalRacePaceSegments.length).toBeGreaterThan(0);
    expect(
      intervalRacePaceSegments.every(
        (segment) => segment.paceSecondsPerKm === paces.intervalSecondsPerKm,
      ),
    ).toBe(true);
    expect(
      baseInterval?.segments.some((segment) => String(segment.phase) === 'race-pace'),
    ).toBe(false);
    expect(
      baseInterval?.segments
        .filter((segment) => String(segment.phase) === 'work')
        .every((segment) => segment.paceSecondsPerKm === paces.intervalSecondsPerKm),
    ).toBe(true);
    expect(progressive?.segments[progressive.segments.length - 2]).toMatchObject({
      phase: 'race-pace',
      paceSecondsPerKm: paces.intervalSecondsPerKm,
    });
  });

  it('caps partial-week sessions and volume by available training days, excluding race day', () => {
    const partialToday = new Date(2026, 0, 7);
    const profile = {
      ...baseProfile,
      currentWeeklyKm: 21,
      sessionsPerWeek: 7,
      raceDate: '2026-01-09',
    };
    const plan = buildPlan(profile, partialToday);
    const [week] = plan.weeks;

    expect(week).toMatchObject({
      startDate: '2026-01-07',
      endDate: '2026-01-09',
      phase: 'taper',
    });
    expect(week?.sessions).toHaveLength(2);
    expect(week?.weeklyDistanceKm).toBe((21 * 0.6 * 2) / 7);
    expect(
      (week?.sessions ?? []).reduce((total, session) => total + session.distanceKm, 0),
    ).toBeCloseTo(week?.weeklyDistanceKm ?? 0, 2);
  });

  it.each([1, 2, 4, 7])(
    'preserves distance totals and caps session counts for %i sessions per week',
    (sessionsPerWeek) => {
      const profile = { ...baseProfile, sessionsPerWeek };
      const plan = buildPlan(profile);

      for (const week of plan.weeks) {
        const availableTrainingDays = week.week === 12 ? 6 : 7;
        const expectedSessions = Math.min(sessionsPerWeek, availableTrainingDays);

        expect(week.sessions).toHaveLength(expectedSessions);
        expect(week.sessions.reduce((sum, session) => sum + session.distanceKm, 0)).toBeCloseTo(
          week.weeklyDistanceKm,
          2,
        );
      }
    },
  );
});
