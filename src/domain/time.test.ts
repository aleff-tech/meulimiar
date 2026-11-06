import { describe, expect, it } from 'vitest';

const timeModules = import.meta.glob<{ formatDuration: (seconds: number) => string }>('./time.ts', {
  eager: true,
});

describe('formatDuration', () => {
  it.each([
    [300, '05:00'],
    [600, '10:00'],
    [598, '09:58'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(timeModules['./time.ts']?.formatDuration(seconds)).toBe(expected);
  });
});
