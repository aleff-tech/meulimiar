import type { PaceTargets } from './paces';
import type { RunnerProfile, TargetDistanceKm } from './profile';

export interface WorkoutSession {
  week: number;
  session: number;
  type: 'easy' | 'quality' | 'long';
  distanceKm: number;
  paceSecondsPerKm: number;
  description: string;
}

export interface TrainingWeek {
  week: number;
  weeklyDistanceKm: number;
  sessions: WorkoutSession[];
}

export interface TrainingPlan {
  weeks: TrainingWeek[];
  warnings: string[];
}

const minimumWeeks: Record<TargetDistanceKm, number> = {
  3: 6,
  5: 6,
  10: 8,
  21.1: 12,
  42.2: 16,
};

function roundKm(distanceKm: number): number {
  return Math.round((distanceKm + Number.EPSILON) * 10) / 10;
}

function sessionTypes(sessionsPerWeek: number): WorkoutSession['type'][] {
  if (sessionsPerWeek === 1) return ['easy'];
  if (sessionsPerWeek === 2) return ['easy', 'long'];

  return ['quality', 'long', ...Array.from({ length: sessionsPerWeek - 2 }, () => 'easy' as const)];
}

function distributeDistance(weeklyDistanceKm: number, types: WorkoutSession['type'][]): number[] {
  if (types.length === 1) return [weeklyDistanceKm];

  const shares =
    types.length === 2
      ? [0.55, 0.45]
      : [0.2, 0.3, ...Array.from({ length: types.length - 2 }, () => 0.5 / (types.length - 2))];

  const distances = shares.slice(0, -1).map((share) => roundKm(weeklyDistanceKm * share));
  const assignedDistance = distances.reduce((total, distance) => total + distance, 0);
  distances.push(roundKm(weeklyDistanceKm - assignedDistance));

  return distances;
}

function sessionPaceAndDescription(
  type: WorkoutSession['type'],
  week: number,
  targetDistanceKm: TargetDistanceKm,
  paces: PaceTargets,
): { paceSecondsPerKm: number; description: string } {
  if (type === 'easy') {
    return {
      paceSecondsPerKm: paces.easySecondsPerKm,
      description: 'Corrida leve para acumular volume com conforto.',
    };
  }

  if (type === 'long') {
    return {
      paceSecondsPerKm: paces.easySecondsPerKm,
      description: 'Corrida longa em ritmo leve, sem forçar.',
    };
  }

  const useIntervals = targetDistanceKm <= 10 && week % 2 === 1;
  return useIntervals
    ? {
        paceSecondsPerKm: paces.intervalSecondsPerKm,
        description: 'Tiros controlados com recuperação leve.',
      }
    : {
        paceSecondsPerKm: paces.thresholdSecondsPerKm,
        description: 'Blocos em ritmo de limiar controlado.',
      };
}

function buildWarnings(profile: RunnerProfile): string[] {
  const requiredWeeks = minimumWeeks[profile.targetDistanceKm];
  if (profile.weeksAvailable >= requiredWeeks) return [];

  return [
    `O ciclo de ${profile.weeksAvailable} semanas é curto para a distância escolhida; não tente compensar aumentando a carga rapidamente.`,
  ];
}

export function buildTrainingPlan(profile: RunnerProfile, paces: PaceTargets): TrainingPlan {
  const types = sessionTypes(profile.sessionsPerWeek);
  const growthRate = profile.preference === 'aggressive' ? 0.08 : 0.05;
  const weeks: TrainingWeek[] = [];
  let peakWeeklyDistance = roundKm(profile.currentWeeklyKm);

  for (let weekNumber = 1; weekNumber <= profile.weeksAvailable; weekNumber += 1) {
    let targetWeeklyDistance = peakWeeklyDistance;

    if (weekNumber === profile.weeksAvailable) {
      targetWeeklyDistance = roundKm(peakWeeklyDistance * 0.6);
    } else if (weekNumber > 1 && weekNumber % 4 === 0) {
      targetWeeklyDistance = roundKm(peakWeeklyDistance * 0.8);
    } else if (weekNumber > 1) {
      targetWeeklyDistance = roundKm(peakWeeklyDistance * (1 + growthRate));
      peakWeeklyDistance = targetWeeklyDistance;
    }

    const distances = distributeDistance(targetWeeklyDistance, types);
    const sessions = types.map((type, index): WorkoutSession => {
      const { paceSecondsPerKm, description } = sessionPaceAndDescription(
        type,
        weekNumber,
        profile.targetDistanceKm,
        paces,
      );

      return {
        week: weekNumber,
        session: index + 1,
        type,
        distanceKm: distances[index],
        paceSecondsPerKm,
        description,
      };
    });

    weeks.push({
      week: weekNumber,
      weeklyDistanceKm: roundKm(sessions.reduce((total, session) => total + session.distanceKm, 0)),
      sessions,
    });
  }

  return { weeks, warnings: buildWarnings(profile) };
}
