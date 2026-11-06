import { describe, expect, it } from 'vitest';
import { getCalendarWeekWindows, parseLocalDate, toLocalDateString } from './calendar';

describe('parseLocalDate', () => {
  it('parses valid local calendar dates including leap day', () => {
    expect(parseLocalDate('2028-02-29')).toEqual(new Date(2028, 1, 29));
  });

  it('rejects malformed and impossible dates', () => {
    expect(parseLocalDate('2028-02-30')).toBeUndefined();
    expect(parseLocalDate('2028/02/29')).toBeUndefined();
    expect(parseLocalDate('')).toBeUndefined();
  });
});

describe('toLocalDateString', () => {
  it('formats Date objects as YYYY-MM-DD', () => {
    expect(toLocalDateString(new Date(2026, 2, 5))).toBe('2026-03-05');
  });
});

describe('getCalendarWeekWindows', () => {
  it('creates Monday-to-Sunday windows and excludes race day from availableTrainingDays', () => {
    expect(getCalendarWeekWindows(new Date(2026, 2, 2), '2026-03-15')).toEqual([
      { startDate: '2026-03-02', endDate: '2026-03-08', availableTrainingDays: 7 },
      { startDate: '2026-03-09', endDate: '2026-03-15', availableTrainingDays: 6 },
    ]);
  });

  it('clips first and last weeks when today and race date land midweek', () => {
    expect(getCalendarWeekWindows(new Date(2026, 2, 4), '2026-03-12')).toEqual([
      { startDate: '2026-03-04', endDate: '2026-03-08', availableTrainingDays: 5 },
      { startDate: '2026-03-09', endDate: '2026-03-12', availableTrainingDays: 3 },
    ]);
  });

  it('counts leap day in training-day totals', () => {
    expect(getCalendarWeekWindows(new Date(2028, 1, 28), '2028-03-01')).toEqual([
      { startDate: '2028-02-28', endDate: '2028-03-01', availableTrainingDays: 2 },
    ]);
  });
});
