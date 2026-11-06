import { formatPace, type PaceTargets } from './paces';
import type { RunnerProfile, TargetDistanceKm } from './profile';

export type QualityWorkoutType = 'threshold' | 'interval' | 'fartlek' | 'progressive';

export interface WorkoutSession {
  week: number;
  session: number;
  type: 'easy' | 'quality' | 'long';
  qualityType?: QualityWorkoutType;
  distanceKm: number;
  paceSecondsPerKm: number;
  description: string;
  warmupDistanceKm: number;
  warmupDurationSeconds: number;
  mainDistanceKm: number;
  cooldownDistanceKm: number;
  cooldownDurationSeconds: number;
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
const qualityWorkoutTypes: QualityWorkoutType[] = [
  'threshold',
  'interval',
  'fartlek',
  'progressive',
];

function toHundredthsFloor(distanceKm: number): number {
  return Math.floor(distanceKm * 100 + 1e-8);
}

function durationToHundredths(durationSeconds: number, paceSecondsPerKm: number): number {
  return Math.floor((durationSeconds / paceSecondsPerKm) * 100 + 1e-8);
}

function durationAtEasyPace(distanceHundredths: number, easyPaceSecondsPerKm: number): number {
  return Math.round((distanceHundredths / 100) * easyPaceSecondsPerKm);
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
  const easyCount = types.filter((type) => type === 'easy').length;
  const targetLongRunShare = longRunShare[targetDistanceKm];
  const easyShare = 1 - targetLongRunShare - (types.includes('quality') ? qualityShare : 0);
  const shares = types.map((type) => {
    if (type === 'quality') return qualityShare;
    if (type === 'long') return targetLongRunShare;
    return easyShare / easyCount;
  });

  const distances = shares.map((share) => Math.floor(weeklyDistanceHundredths * share + 1e-8));
  const assignedDistance = distances.reduce((total, distance) => total + distance, 0);
  const remainder = weeklyDistanceHundredths - assignedDistance;
  const easyIndex = types.indexOf('easy');
  if (easyIndex < 0) {
    throw new Error('A distribuição de sessões precisa incluir um treino leve.');
  }

  return distances.map((distance, index) => (index === easyIndex ? distance + remainder : distance));
}

function qualityTypeForWeek(week: number): QualityWorkoutType {
  return qualityWorkoutTypes[(week - 1) % qualityWorkoutTypes.length];
}

function targetPhaseDistances(
  type: WorkoutSession['type'],
  paces: PaceTargets,
): { warmupHundredths: number; cooldownHundredths: number } {
  const warmupSeconds = type === 'quality' ? 10 * 60 : 5 * 60;
  const cooldownSeconds = 5 * 60;

  return {
    warmupHundredths: durationToHundredths(warmupSeconds, paces.easySecondsPerKm),
    cooldownHundredths: durationToHundredths(cooldownSeconds, paces.easySecondsPerKm),
  };
}

function fitPhaseDistances(
  distanceHundredths: number,
  targetWarmupHundredths: number,
  targetCooldownHundredths: number,
): { warmupHundredths: number; cooldownHundredths: number; shortened: boolean } {
  if (targetWarmupHundredths + targetCooldownHundredths <= distanceHundredths) {
    return {
      warmupHundredths: targetWarmupHundredths,
      cooldownHundredths: targetCooldownHundredths,
      shortened: false,
    };
  }

  const maximumPhaseHundredths = Math.floor(distanceHundredths / 2);
  const targetPhaseHundredths = targetWarmupHundredths + targetCooldownHundredths;
  const warmupHundredths = Math.floor(
    (maximumPhaseHundredths * targetWarmupHundredths) / targetPhaseHundredths,
  );

  return {
    warmupHundredths,
    cooldownHundredths: maximumPhaseHundredths - warmupHundredths,
    shortened: true,
  };
}

function qualityPaceSecondsPerKm(qualityType: QualityWorkoutType, paces: PaceTargets): number {
  return qualityType === 'threshold' || qualityType === 'progressive'
    ? paces.thresholdSecondsPerKm
    : paces.intervalSecondsPerKm;
}

function formatDistance(hundredths: number): string {
  return `${(hundredths / 100).toFixed(2)} km`;
}

interface RepeatOption {
  label: string;
  distanceHundredths: number;
}

interface RepeatSet {
  repetitions: number;
  work: RepeatOption;
  recovery: RepeatOption;
  recoveryCount: number;
  remainingHundredths: number;
}

function fitRepeatSet(
  mainHundredths: number,
  workOptions: RepeatOption[],
  recoveryOptions: RepeatOption[],
): RepeatSet {
  let best: RepeatSet | undefined;

  for (const work of workOptions) {
    for (const recovery of recoveryOptions) {
      for (let repetitions = 1; ; repetitions += 1) {
        const recoveryCount = repetitions - 1;
        const usedHundredths =
          repetitions * work.distanceHundredths + recoveryCount * recovery.distanceHundredths;
        if (usedHundredths > mainHundredths) break;

        const candidate: RepeatSet = {
          repetitions,
          work,
          recovery,
          recoveryCount,
          remainingHundredths: mainHundredths - usedHundredths,
        };
        if (
          !best ||
          candidate.remainingHundredths < best.remainingHundredths ||
          (candidate.remainingHundredths === best.remainingHundredths &&
            candidate.repetitions < best.repetitions)
        ) {
          best = candidate;
        }
      }
    }
  }

  if (!best) {
    throw new RangeError('A distância principal não comporta um bloco de trabalho.');
  }

  return best;
}

function qualityDescription(
  qualityType: QualityWorkoutType,
  mainHundredths: number,
  paces: PaceTargets,
): string {
  const mainDistance = formatDistance(mainHundredths);
  const thresholdPace = `${formatPace(paces.thresholdSecondsPerKm)} min/km`;
  const intervalPace = `${formatPace(paces.intervalSecondsPerKm)} min/km`;
  const easyPace = `${formatPace(paces.easySecondsPerKm)} min/km`;

  if (qualityType === 'threshold') {
    const set = fitRepeatSet(
      mainHundredths,
      [2, 3, 4, 5].map((minutes) => ({
        label: `${minutes} min`,
        distanceHundredths: durationToHundredths(
          minutes * 60,
          paces.thresholdSecondsPerKm,
        ),
      })),
      [1, 2].map((minutes) => ({
        label: `${minutes} min`,
        distanceHundredths: durationToHundredths(minutes * 60, paces.easySecondsPerKm),
      })),
    );
    const work = `${set.repetitions} × ${set.work.label} a ${thresholdPace} (${formatDistance(set.work.distanceHundredths)} por bloco)`;
    const recoveries =
      set.recoveryCount > 0
        ? `${set.recoveryCount} × ${set.recovery.label} de recuperação leve a ${easyPace} (${formatDistance(set.recovery.distanceHundredths)})`
        : undefined;
    const remaining =
      set.remainingHundredths > 0
        ? `${formatDistance(set.remainingHundredths)} leve para completar ${mainDistance}`
        : undefined;

    return `Limiar: ${[work, recoveries, remaining].filter(Boolean).join('; ')} na parte principal.`;
  }
  if (qualityType === 'interval') {
    const set = fitRepeatSet(
      mainHundredths,
      [200, 300, 400].map((meters) => ({
        label: `${meters} m`,
        distanceHundredths: meters / 10,
      })),
      [100, 200].map((meters) => ({
        label: `${meters} m`,
        distanceHundredths: meters / 10,
      })),
    );
    const work = `${set.repetitions} × ${set.work.label} a ${intervalPace} (${formatDistance(set.work.distanceHundredths)} por repetição)`;
    const recoveries =
      set.recoveryCount > 0
        ? `${set.recoveryCount} × ${set.recovery.label} de recuperação leve a ${easyPace} (${formatDistance(set.recovery.distanceHundredths)})`
        : undefined;
    const remaining =
      set.remainingHundredths > 0
        ? `${formatDistance(set.remainingHundredths)} leve para completar ${mainDistance}`
        : undefined;

    return `Tiros/intervalado: ${[work, recoveries, remaining].filter(Boolean).join('; ')} na parte principal.`;
  }
  if (qualityType === 'fartlek') {
    const fastHundredths = durationToHundredths(60, paces.intervalSecondsPerKm);
    const easyHundredths = durationToHundredths(60, paces.easySecondsPerKm);
    const cycleHundredths = fastHundredths + easyHundredths;
    const cycles = Math.floor(mainHundredths / cycleHundredths);
    const remainingHundredths = mainHundredths - cycles * cycleHundredths;
    const cycleDescription = `${cycles} ciclos de 1 min rápido a ${intervalPace} (${formatDistance(fastHundredths)} por ciclo) + 1 min leve a ${easyPace} (${formatDistance(easyHundredths)} por ciclo)`;
    const remaining =
      remainingHundredths > 0
        ? `${formatDistance(remainingHundredths)} leve extra`
        : undefined;

    return `Fartlek: ${[cycleDescription, remaining].filter(Boolean).join('; ')} para completar ${mainDistance} na parte principal.`;
  }

  const midpointPaceSecondsPerKm = Math.round(
    (paces.easySecondsPerKm + paces.thresholdSecondsPerKm) / 2,
  );
  const easyHundredths = Math.floor(mainHundredths * 0.4 + 1e-8);
  const midpointHundredths = Math.floor(mainHundredths * 0.4 + 1e-8);
  const thresholdHundredths = mainHundredths - easyHundredths - midpointHundredths;

  return `Progressivo: ${formatDistance(easyHundredths)} leve a ${easyPace}, ${formatDistance(midpointHundredths)} moderado a ${formatPace(midpointPaceSecondsPerKm)} min/km e ${formatDistance(thresholdHundredths)} em limiar a ${thresholdPace}.`;
}

function sessionPaceAndDescription(
  type: WorkoutSession['type'],
  qualityType: QualityWorkoutType | undefined,
  mainHundredths: number,
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
  if (!qualityType) {
    throw new Error('Uma sessão de qualidade precisa de um subtipo.');
  }

  return {
    paceSecondsPerKm: qualityPaceSecondsPerKm(qualityType, paces),
    description: qualityDescription(qualityType, mainHundredths, paces),
  };
}

function orderSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  const qualitySessions = sessions.filter((session) => session.type === 'quality');
  const easySessions = sessions.filter((session) => session.type === 'easy');
  const longSessions = sessions.filter((session) => session.type === 'long');

  return [
    ...qualitySessions,
    ...easySessions.slice(0, 1),
    ...longSessions,
    ...easySessions.slice(1),
  ];
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
      'Com uma sessão por semana, não é possível separar um treino longo das demais sessões; avalie se o volume planejado é adequado à distância da prova.',
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
  let phasesShortened = false;
  let qualityChangedToEasy = false;
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
    const sessions = orderSessions(
      types.map((allocatedType, index): WorkoutSession => {
        const distanceHundredths = distances[index];
        const allocatedQualityType =
          allocatedType === 'quality' ? qualityTypeForWeek(weekNumber) : undefined;
        const qualityTargets = targetPhaseDistances('quality', paces);
        const canFitQuality =
          allocatedType !== 'quality' ||
          qualityTargets.warmupHundredths +
            qualityTargets.cooldownHundredths +
            100 <=
            distanceHundredths;
        const type = allocatedType === 'quality' && !canFitQuality ? 'easy' : allocatedType;
        if (allocatedType === 'quality' && !canFitQuality) qualityChangedToEasy = true;

        const phases = targetPhaseDistances(type, paces);
        const fittedPhases = fitPhaseDistances(
          distanceHundredths,
          phases.warmupHundredths,
          phases.cooldownHundredths,
        );
        if (fittedPhases.shortened) phasesShortened = true;
        const mainHundredths =
          distanceHundredths - fittedPhases.warmupHundredths - fittedPhases.cooldownHundredths;
        const qualityType = type === 'quality' ? allocatedQualityType : undefined;
        const { paceSecondsPerKm, description } = sessionPaceAndDescription(
          type,
          qualityType,
          mainHundredths,
          paces,
        );

        return {
          week: weekNumber,
          session: 0,
          type,
          qualityType,
          distanceKm: distanceHundredths / 100,
          paceSecondsPerKm,
          description,
          warmupDistanceKm: fittedPhases.warmupHundredths / 100,
          warmupDurationSeconds: durationAtEasyPace(
            fittedPhases.warmupHundredths,
            paces.easySecondsPerKm,
          ),
          mainDistanceKm: mainHundredths / 100,
          cooldownDistanceKm: fittedPhases.cooldownHundredths / 100,
          cooldownDurationSeconds: durationAtEasyPace(
            fittedPhases.cooldownHundredths,
            paces.easySecondsPerKm,
          ),
        };
      }),
    ).map((session, index) => ({ ...session, session: index + 1 }));

    weeks.push({
      week: weekNumber,
      weeklyDistanceKm: distances.reduce((total, distance) => total + distance, 0) / 100,
      sessions,
    });
  }

  const warnings = buildWarnings(profile, weeks);
  if (phasesShortened) {
    warnings.push(
      'As fases de aquecimento e desaquecimento foram reduzidas proporcionalmente em sessões curtas para caber na distância planejada.',
    );
  }
  if (qualityChangedToEasy) {
    warnings.push(
      'Uma sessão de qualidade foi adaptada para corrida leve porque não comportava as fases e pelo menos 1 km de trabalho principal.',
    );
  }

  return { weeks, warnings };
}
