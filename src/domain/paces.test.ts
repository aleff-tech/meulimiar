import { describe, expect, it } from 'vitest';
import { calculatePaces, formatPace } from './paces';

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
