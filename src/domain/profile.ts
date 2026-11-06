import { parseLocalDate, toLocalDateString } from './calendar';
export type TargetDistanceKm = 3 | 5 | 10 | 21.1 | 42.2;

export interface RunnerFormValues {
  targetDistanceKm: string;
  goalTimeHours: string;
  goalTimeMinutes: string;
  goalTimeSeconds: string;
  weightKg: string;
  heightCm: string;
  currentWeeklyKm: string;
  sessionsPerWeek: string;
  raceDate: string;
  adultConfirmed?: boolean;
}

export interface RunnerProfile {
  targetDistanceKm: TargetDistanceKm;
  goalTimeSeconds: number;
  weightKg: number;
  heightCm: number;
  currentWeeklyKm: number;
  sessionsPerWeek: number;
  raceDate: string;
  adultConfirmed: boolean;
}

export type ProfileErrors = Partial<Record<keyof RunnerFormValues, string>>;

export type ProfileParseResult =
  | { ok: true; value: RunnerProfile }
  | { ok: false; errors: ProfileErrors };
type NumericFormField =
  | 'targetDistanceKm'
  | 'goalTimeHours'
  | 'goalTimeMinutes'
  | 'goalTimeSeconds'
  | 'weightKg'
  | 'heightCm'
  | 'currentWeeklyKm'
  | 'sessionsPerWeek';

const targetDistances: TargetDistanceKm[] = [3, 5, 10, 21.1, 42.2];

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readNumber(
  values: RunnerFormValues,
  field: NumericFormField,
  errors: ProfileErrors,
  label: string,
  min: number,
  max: number,
  integer = false,
): number | undefined {
  const parsed = parseNumber(values[field]);
  if (parsed === undefined || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
    errors[field] = `${label} deve estar entre ${min} e ${max}${integer ? ' e ser inteiro' : ''}.`;
    return undefined;
  }

  return parsed;
}

function isTargetDistance(value: number): value is TargetDistanceKm {
  return targetDistances.some((distance) => distance === value);
}

export function parseRunnerProfile(values: RunnerFormValues, today: Date = new Date()): ProfileParseResult {
  const errors: ProfileErrors = {};
  const targetDistanceKm = parseNumber(values.targetDistanceKm);

  if (targetDistanceKm === undefined || !isTargetDistance(targetDistanceKm)) {
    errors.targetDistanceKm = 'Selecione uma distância de prova válida.';
  }

  const hours = readNumber(values, 'goalTimeHours', errors, 'Horas', 0, 23, true);
  const minutes = readNumber(values, 'goalTimeMinutes', errors, 'Minutos', 0, 59, true);
  const seconds = readNumber(values, 'goalTimeSeconds', errors, 'Segundos', 0, 59, true);

  let goalTimeSeconds: number | undefined;
  if (hours !== undefined && minutes !== undefined && seconds !== undefined) {
    goalTimeSeconds = hours * 3600 + minutes * 60 + seconds;
    if (goalTimeSeconds <= 0) {
      errors.goalTimeSeconds = 'Informe um tempo alvo maior que zero.';
      goalTimeSeconds = undefined;
    }
  }

  const weightKg = readNumber(values, 'weightKg', errors, 'Peso', 20, 250);
  const heightCm = readNumber(values, 'heightCm', errors, 'Altura', 100, 250);
  const currentWeeklyKm = readNumber(values, 'currentWeeklyKm', errors, 'Km semanais', 1, 250);
  const sessionsPerWeek = readNumber(values, 'sessionsPerWeek', errors, 'Sessões por semana', 1, 7, true);
  const parsedRaceDate = parseLocalDate(values.raceDate);
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!parsedRaceDate) {
    errors.raceDate = 'Informe uma data de prova válida.';
  } else {
    const diffDays = Math.round((parsedRaceDate.getTime() - todayLocal.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) {
      errors.raceDate = 'A data da prova deve ser futura.';
    } else if (diffDays > 24 * 7) {
      errors.raceDate = 'A prova deve estar dentro de 24 semanas.';
    }
  }

  if (
    Object.keys(errors).length > 0 ||
    targetDistanceKm === undefined ||
    !isTargetDistance(targetDistanceKm) ||
    goalTimeSeconds === undefined ||
    weightKg === undefined ||
    heightCm === undefined ||
    currentWeeklyKm === undefined ||
    sessionsPerWeek === undefined ||
    parsedRaceDate === undefined
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      targetDistanceKm,
      goalTimeSeconds,
      weightKg,
      heightCm,
      currentWeeklyKm,
      sessionsPerWeek,
      raceDate: toLocalDateString(parsedRaceDate),
      adultConfirmed: values.adultConfirmed === true,
    },
  };
}
