import type { RunnerProfile, TargetDistanceKm } from './profile';

export interface PaceTargets {
  easySecondsPerKm: number;
  thresholdSecondsPerKm: number;
  intervalSecondsPerKm: number;
  clamped: boolean;
}

export interface GoalAssessment {
  goalRacePaceSecondsPerKm: number;
  currentEquivalentRaceTimeSeconds: number;
  ambitious: boolean;
  prescribedRacePaceSecondsPerKm: number;
}

export const PACE_RANGE_WARNING =
  'Seus ritmos foram limitados à faixa de referência de 20:00 a 25:00 nos 5 km e podem não refletir seu esforço; ajuste pelo conforto.';

interface PaceAnchor extends PaceTargets {
  fiveKmTimeSeconds: number;
}

const anchors: PaceAnchor[] = [
  {
    fiveKmTimeSeconds: 1200,
    easySecondsPerKm: 320,
    thresholdSecondsPerKm: 255,
    intervalSecondsPerKm: 235,
    clamped: false,
  },
  {
    fiveKmTimeSeconds: 1350,
    easySecondsPerKm: 360,
    thresholdSecondsPerKm: 285,
    intervalSecondsPerKm: 265,
    clamped: false,
  },
  {
    fiveKmTimeSeconds: 1500,
    easySecondsPerKm: 400,
    thresholdSecondsPerKm: 315,
    intervalSecondsPerKm: 290,
    clamped: false,
  },
];

function interpolate(lower: number, upper: number, fraction: number): number {
  return Math.round(lower + (upper - lower) * fraction);
}

function paceResult(anchor: PaceAnchor, clamped: boolean): PaceTargets {
  return {
    easySecondsPerKm: anchor.easySecondsPerKm,
    thresholdSecondsPerKm: anchor.thresholdSecondsPerKm,
    intervalSecondsPerKm: anchor.intervalSecondsPerKm,
    clamped,
  };
}

export function calculatePaces(fiveKmTimeSeconds: number): PaceTargets {
  if (!Number.isFinite(fiveKmTimeSeconds) || fiveKmTimeSeconds <= 0) {
    throw new RangeError('O tempo de 5 km deve ser um número positivo.');
  }

  const first = anchors[0];
  const last = anchors[anchors.length - 1];

  if (fiveKmTimeSeconds < first.fiveKmTimeSeconds) {
    return paceResult(first, true);
  }
  if (fiveKmTimeSeconds > last.fiveKmTimeSeconds) {
    return paceResult(last, true);
  }
  if (fiveKmTimeSeconds === first.fiveKmTimeSeconds) {
    return paceResult(first, false);
  }
  if (fiveKmTimeSeconds === last.fiveKmTimeSeconds) {
    return paceResult(last, false);
  }

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const lower = anchors[index];
    const upper = anchors[index + 1];

    if (fiveKmTimeSeconds <= upper.fiveKmTimeSeconds) {
      const fraction =
        (fiveKmTimeSeconds - lower.fiveKmTimeSeconds) /
        (upper.fiveKmTimeSeconds - lower.fiveKmTimeSeconds);

      return {
        easySecondsPerKm: interpolate(lower.easySecondsPerKm, upper.easySecondsPerKm, fraction),
        thresholdSecondsPerKm: interpolate(
          lower.thresholdSecondsPerKm,
          upper.thresholdSecondsPerKm,
          fraction,
        ),
        intervalSecondsPerKm: interpolate(
          lower.intervalSecondsPerKm,
          upper.intervalSecondsPerKm,
          fraction,
        ),
        clamped: false,
      };
    }
  }

  return paceResult(last, true);
}

export function estimateRaceTimeSeconds(
  fiveKmTimeSeconds: number,
  targetDistanceKm: TargetDistanceKm,
): number {
  if (!Number.isFinite(fiveKmTimeSeconds) || fiveKmTimeSeconds <= 0) {
    throw new RangeError('O tempo de 5 km deve ser um número positivo.');
  }

  return Math.round(fiveKmTimeSeconds * (targetDistanceKm / 5) ** 1.06);
}

export function assessRaceGoal(
  profile: RunnerProfile,
  paces: PaceTargets,
): GoalAssessment {
  const goalRacePaceSecondsPerKm =
    profile.goalTimeSeconds / profile.targetDistanceKm;
  const currentEquivalentRaceTimeSeconds = estimateRaceTimeSeconds(
    profile.fiveKmTimeSeconds,
    profile.targetDistanceKm,
  );

  return {
    goalRacePaceSecondsPerKm,
    currentEquivalentRaceTimeSeconds,
    ambitious: profile.goalTimeSeconds <= currentEquivalentRaceTimeSeconds * 0.95,
    prescribedRacePaceSecondsPerKm: Math.max(
      goalRacePaceSecondsPerKm,
      paces.intervalSecondsPerKm,
    ),
  };
}

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    throw new RangeError('O ritmo deve ser um número positivo.');
  }

  const roundedSeconds = Math.round(secondsPerKm);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
