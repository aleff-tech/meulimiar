import { describe, expect, it } from 'vitest';
import {
  assessRaceGoal,
  calculatePaces,
  estimateRaceTimeSeconds,
  formatPace,
} from './paces';
import type { RunnerProfile } from './profile';

const runnerProfile: RunnerProfile = {
  targetDistanceKm: 10,
  fiveKmTimeSeconds: 1350,
  goalTimeSeconds: 2800,
  weightKg: 70,
  heightCm: 175,
  currentWeeklyKm: 30,
  sessionsPerWeek: 4,
  raceDate: '2026-12-01',
  adultConfirmed: true,
};

describe('calculatePaces', () => {
  it.each([
    [1200, 320, 255, 235],
    [1350, 360, 285, 265],
    [1500, 400, 315, 290],
  ])('uses the supplied pace anchors at %i seconds for 5 km', (
    fiveKmTimeSeconds,
    easySecondsPerKm,
    thresholdSecondsPerKm,
    intervalSecondsPerKm,
  ) => {
    expect(calculatePaces(fiveKmTimeSeconds)).toEqual({
      easySecondsPerKm,
      thresholdSecondsPerKm,
      intervalSecondsPerKm,
      clamped: false,
    });
  });

  it('interpolates the 21:15 mark halfway between the first two anchors', () => {
    expect(calculatePaces(1275)).toEqual({
      easySecondsPerKm: 340,
      thresholdSecondsPerKm: 270,
      intervalSecondsPerKm: 250,
      clamped: false,
    });
  });

  it('clamps a faster-than-reference time to the 20:00 paces', () => {
    expect(calculatePaces(1199)).toEqual({
      easySecondsPerKm: 320,
      thresholdSecondsPerKm: 255,
      intervalSecondsPerKm: 235,
      clamped: true,
    });
  });

  it('clamps a slower-than-reference time to the 25:00 paces', () => {
    expect(calculatePaces(1501)).toEqual({
      easySecondsPerKm: 400,
      thresholdSecondsPerKm: 315,
      intervalSecondsPerKm: 290,
      clamped: true,
    });
  });

  it('rejects a non-positive 5 km time', () => {
    expect(() => calculatePaces(0)).toThrow(RangeError);
  });
});

describe('formatPace', () => {
  it('formats pace as minutes and zero-padded seconds per kilometre', () => {
    expect(formatPace(320)).toBe('5:20');
    expect(formatPace(60)).toBe('1:00');
  });

  it('rejects an invalid pace', () => {
    expect(() => formatPace(Number.NaN)).toThrow(RangeError);
  });
});

describe('estimateRaceTimeSeconds', () => {
  it('returns the supplied time for an equivalent 5 km distance', () => {
    expect(estimateRaceTimeSeconds(1350, 5)).toBe(1350);
  });

  it('estimates 2815 seconds for a 22:30 5 km result extrapolated to 10 km', () => {
    expect(estimateRaceTimeSeconds(1350, 10)).toBe(2815);
  });
});

describe('assessRaceGoal', () => {
  const paces = {
    easySecondsPerKm: 360,
    thresholdSecondsPerKm: 285,
    intervalSecondsPerKm: 265,
    clamped: false,
  };

  it('flags a goal at the 5% ambition threshold but not just outside it', () => {
    const ambitionThreshold = 2815 * 0.95;

    expect(
      assessRaceGoal(
        { ...runnerProfile, goalTimeSeconds: ambitionThreshold + 0.01 },
        paces,
      ).ambitious,
    ).toBe(false);
    expect(
      assessRaceGoal(
        { ...runnerProfile, goalTimeSeconds: ambitionThreshold },
        paces,
      ).ambitious,
    ).toBe(true);
  });

  it('caps a faster goal pace at the current interval pace', () => {
    expect(
      assessRaceGoal({ ...runnerProfile, goalTimeSeconds: 2400 }, paces),
    ).toMatchObject({
      goalRacePaceSecondsPerKm: 240,
      currentEquivalentRaceTimeSeconds: 2815,
      ambitious: true,
      prescribedRacePaceSecondsPerKm: 265,
    });
  });
});
