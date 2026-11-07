export interface CalendarWeekWindow {
  startDate: string;
  endDate: string;
  availableTrainingDays: number;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function mondayOfWeek(date: Date): Date {
  const weekdayOffset = (date.getDay() + 6) % 7;
  return addDays(date, -weekdayOffset);
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((startOfLocalDay(end).getTime() - startOfLocalDay(start).getTime()) / DAY_IN_MS);
}

export function parseLocalDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return parsed;
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCalendarWeekWindows(today: Date, raceDate: string): CalendarWeekWindow[] {
  const race = parseLocalDate(raceDate);
  if (!race) return [];

  const todayDate = startOfLocalDay(today);
  if (race.getTime() <= todayDate.getTime()) return [];

  const windows: CalendarWeekWindow[] = [];
  let windowStart = todayDate;

  while (windowStart.getTime() < race.getTime()) {
    const weekMonday = mondayOfWeek(windowStart);
    const weekSunday = addDays(weekMonday, 6);
    const windowEnd = minDate(weekSunday, race);
    const inclusiveDays = daysBetween(windowStart, windowEnd) + 1;
    const availableTrainingDays = windowEnd.getTime() === race.getTime() ? inclusiveDays - 1 : inclusiveDays;

    windows.push({
      startDate: toLocalDateString(windowStart),
      endDate: toLocalDateString(windowEnd),
      availableTrainingDays,
    });

    windowStart = addDays(windowEnd, 1);
  }

  return windows;
}
