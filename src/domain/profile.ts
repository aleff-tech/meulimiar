export type TargetDistanceKm = 3 | 5 | 10 | 21.1 | 42.2;
export type TrainingPreference = 'light' | 'aggressive';

export interface RunnerFormValues {
  targetDistanceKm: string;
  fiveKmHours: string;
  fiveKmMinutes: string;
  fiveKmSeconds: string;
  weightKg: string;
  heightCm: string;
  currentWeeklyKm: string;
  sessionsPerWeek: string;
  weeksAvailable: string;
  preference: string;
}

export interface RunnerProfile {
  targetDistanceKm: TargetDistanceKm;
  fiveKmTimeSeconds: number;
  weightKg: number;
  heightCm: number;
  currentWeeklyKm: number;
  sessionsPerWeek: number;
  weeksAvailable: number;
  preference: TrainingPreference;
}

export type ProfileErrors = Partial<Record<keyof RunnerFormValues, string>>;

export type ProfileParseResult =
  | { ok: true; value: RunnerProfile }
  | { ok: false; errors: ProfileErrors };

const targetDistances: TargetDistanceKm[] = [3, 5, 10, 21.1, 42.2];

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readNumber(
  values: RunnerFormValues,
  field: keyof RunnerFormValues,
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

export function parseRunnerProfile(values: RunnerFormValues): ProfileParseResult {
  const errors: ProfileErrors = {};
  const targetDistanceKm = parseNumber(values.targetDistanceKm);

  if (targetDistanceKm === undefined || !isTargetDistance(targetDistanceKm)) {
    errors.targetDistanceKm = 'Selecione uma distância de prova válida.';
  }

  const hours = readNumber(values, 'fiveKmHours', errors, 'Horas', 0, 23, true);
  const minutes = readNumber(values, 'fiveKmMinutes', errors, 'Minutos', 0, 59, true);
  const seconds = readNumber(values, 'fiveKmSeconds', errors, 'Segundos', 0, 59, true);

  let fiveKmTimeSeconds: number | undefined;
  if (hours !== undefined && minutes !== undefined && seconds !== undefined) {
    fiveKmTimeSeconds = hours * 3600 + minutes * 60 + seconds;
    if (fiveKmTimeSeconds < 60 || fiveKmTimeSeconds > 7200) {
      errors.fiveKmMinutes = 'O tempo nos 5 km deve ficar entre 00:01:00 e 02:00:00.';
      fiveKmTimeSeconds = undefined;
    }
  }

  const weightKg = readNumber(values, 'weightKg', errors, 'Peso', 20, 250);
  const heightCm = readNumber(values, 'heightCm', errors, 'Altura', 100, 250);
  const currentWeeklyKm = readNumber(values, 'currentWeeklyKm', errors, 'Km semanais', 1, 250);
  const sessionsPerWeek = readNumber(values, 'sessionsPerWeek', errors, 'Sessões por semana', 1, 7, true);
  const weeksAvailable = readNumber(values, 'weeksAvailable', errors, 'Semanas disponíveis', 4, 24, true);
  const preference = values.preference;

  if (preference !== 'light' && preference !== 'aggressive') {
    errors.preference = 'Selecione uma preferência de carga válida.';
  }

  if (
    Object.keys(errors).length > 0 ||
    targetDistanceKm === undefined ||
    !isTargetDistance(targetDistanceKm) ||
    fiveKmTimeSeconds === undefined ||
    weightKg === undefined ||
    heightCm === undefined ||
    currentWeeklyKm === undefined ||
    sessionsPerWeek === undefined ||
    weeksAvailable === undefined ||
    (preference !== 'light' && preference !== 'aggressive')
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      targetDistanceKm,
      fiveKmTimeSeconds,
      weightKg,
      heightCm,
      currentWeeklyKm,
      sessionsPerWeek,
      weeksAvailable,
      preference,
    },
  };
}
