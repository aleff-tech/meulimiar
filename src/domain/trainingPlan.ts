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

const longRunShare: Record<TargetDistanceKm, number> = {
  3: 0.2,
  5: 0.25,
  10: 0.3,
  21.1: 0.35,
  42.2: 0.4,
};

const qualityShare = 0.2;

function toHundredthsFloor(distanceKm: number): number {
  return Math.floor(distanceKm * 100 + 1e-8);
}

function sessionTypes(sessionsPerWeek: number): WorkoutSession['type'][] {
  if (sessionsPerWeek === 1) return ['easy'];
  if (sessionsPerWeek === 2) return ['easy', 'long'];

  return ['quality', 'long', ...Array.from({ length: sessionsPerWeek - 2 }, () => 'easy' as const)];
}

function distributeDistance(
  weeklyDistanceHundredths: number,
  types: WorkoutSession['type'][],
  targetDistanceKm: TargetDistanceKm,
): number[] {
  const targetLongRunShare = longRunShare[targetDistanceKm];
  const shares =
    types.length === 1
      ? [1]
      : types.length === 2
        ? [1 - targetLongRunShare, targetLongRunShare]
        : [
            qualityShare,
            targetLongRunShare,
            ...Array.from(
              { length: types.length - 2 },
              () => (1 - qualityShare - targetLongRunShare) / (types.length - 2),
            ),
          ];

  const distances = shares
    .slice(0, -1)
    .map((share) => Math.floor(weeklyDistanceHundredths * share + 1e-8));
  const assignedDistance = distances.reduce((total, distance) => total + distance, 0);
  distances.push(weeklyDistanceHundredths - assignedDistance);

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

function buildWarnings(profile: RunnerProfile, weeks: TrainingWeek[]): string[] {
  const warnings: string[] = [];
  const requiredWeeks = minimumWeeks[profile.targetDistanceKm];

  if (profile.weeksAvailable < requiredWeeks) {
    warnings.push(
      `O ciclo de ${profile.weeksAvailable} semanas é curto para a distância escolhida; não tente compensar aumentando a carga rapidamente.`,
    );
  }

  if (profile.sessionsPerWeek === 1) {
    warnings.push(
      'Com uma sessão por semana, o plano não inclui treino longo; ele não desenvolve a distância necessária para a prova.',
    );
  } else {
    const longestRunHundredths = weeks.reduce(
      (longest, week) =>
        Math.max(
          longest,
          ...week.sessions
            .filter((session) => session.type === 'long')
            .map((session) => toHundredthsFloor(session.distanceKm)),
        ),
      0,
    );
    const targetDistanceHundredths = Math.round(profile.targetDistanceKm * 100);

    if (longestRunHundredths * 100 < targetDistanceHundredths * 75) {
      warnings.push(
        'A maior corrida longa planejada fica abaixo de 75% da distância-alvo; o ciclo pode não ser suficiente para a prova. Não aumente a carga para compensar.',
      );
    }
  }

  return warnings;
}

export function buildTrainingPlan(profile: RunnerProfile, paces: PaceTargets): TrainingPlan {
  const types = sessionTypes(profile.sessionsPerWeek);
  const growthRate = profile.preference === 'aggressive' ? 0.08 : 0.05;
  const weeks: TrainingWeek[] = [];
  let peakWeeklyDistanceHundredths = toHundredthsFloor(profile.currentWeeklyKm);

  for (let weekNumber = 1; weekNumber <= profile.weeksAvailable; weekNumber += 1) {
    let targetWeeklyDistanceHundredths = peakWeeklyDistanceHundredths;

    if (weekNumber === profile.weeksAvailable) {
      targetWeeklyDistanceHundredths = Math.floor(peakWeeklyDistanceHundredths * 0.6 + 1e-8);
    } else if (weekNumber > 1 && weekNumber % 4 === 0) {
      targetWeeklyDistanceHundredths = Math.floor(peakWeeklyDistanceHundredths * 0.8 + 1e-8);
    } else if (weekNumber > 1) {
      targetWeeklyDistanceHundredths = Math.floor(
        peakWeeklyDistanceHundredths * (1 + growthRate) + 1e-8,
      );
      peakWeeklyDistanceHundredths = targetWeeklyDistanceHundredths;
    }

    const distances = distributeDistance(
      targetWeeklyDistanceHundredths,
      types,
      profile.targetDistanceKm,
    );
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
        distanceKm: distances[index] / 100,
        paceSecondsPerKm,
        description,
      };
    });

    weeks.push({
      week: weekNumber,
      weeklyDistanceKm: distances.reduce((total, distance) => total + distance, 0) / 100,
      sessions,
    });
  }

  return { weeks, warnings: buildWarnings(profile, weeks) };
}
