import { assessRaceGoal, formatPace, type PaceTargets } from './paces';
import { getCalendarWeekWindows, type CalendarWeekWindow } from './calendar';
import type { RunnerProfile, TargetDistanceKm } from './profile';

export type QualityWorkoutType = 'threshold' | 'interval' | 'fartlek' | 'progressive';

export type WorkoutSegmentPhase =
  | 'warmup'
  | 'easy'
  | 'work'
  | 'recovery'
  | 'moderate'
  | 'cooldown'
  | 'race-pace';

export type TrainingPhase = 'base' | 'development' | 'specific' | 'taper';

export interface WorkoutSegment {
  phase: WorkoutSegmentPhase;
  distanceKm: number;
  paceSecondsPerKm: number;
  label: string;
}

export interface WorkoutSession {
  week: number;
  session: number;
  type: 'easy' | 'quality' | 'long';
  qualityType?: QualityWorkoutType;
  segments: WorkoutSegment[];
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
  phase: TrainingPhase;
  startDate: string;
  endDate: string;
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
  if (sessionsPerWeek <= 0) return [];
  if (sessionsPerWeek === 1) return ['easy'];
  if (sessionsPerWeek === 2) return ['easy', 'long'];

  return ['quality', 'long', ...Array.from({ length: sessionsPerWeek - 2 }, () => 'easy' as const)];
}

function distributeDistance(
  weeklyDistanceHundredths: number,
  types: WorkoutSession['type'][],
  targetDistanceKm: TargetDistanceKm,
): number[] {
  if (types.length === 0) return [];

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

function makeSegment(
  phase: WorkoutSegmentPhase,
  distanceHundredths: number,
  paceSecondsPerKm: number,
  description: string,
): WorkoutSegment {
  return {
    phase,
    distanceKm: distanceHundredths / 100,
    paceSecondsPerKm,
    label: `${description}: ${formatDistance(distanceHundredths)} a ${formatPace(paceSecondsPerKm)} min/km`,
  };
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

function repeatedWorkSegments(
  set: RepeatSet,
  workPaceSecondsPerKm: number,
  recoveryPaceSecondsPerKm: number,
  workDescription: string,
  workPhase: WorkoutSegmentPhase = 'work',
): WorkoutSegment[] {
  const segments: WorkoutSegment[] = [];

  for (let repetition = 0; repetition < set.repetitions; repetition += 1) {
    segments.push(
      makeSegment(workPhase, set.work.distanceHundredths, workPaceSecondsPerKm, workDescription),
    );
    if (repetition < set.recoveryCount) {
      segments.push(
        makeSegment(
          'recovery',
          set.recovery.distanceHundredths,
          recoveryPaceSecondsPerKm,
          'Recuperação leve',
        ),
      );
    }
  }

  if (set.remainingHundredths > 0) {
    segments.push(
      makeSegment('easy', set.remainingHundredths, recoveryPaceSecondsPerKm, 'Leve extra'),
    );
  }

  return segments;
}

function qualityPrescription(
  qualityType: QualityWorkoutType,
  mainHundredths: number,
  paces: PaceTargets,
  racePaceSecondsPerKm?: number,
): { description: string; segments: WorkoutSegment[] } {
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

    return {
      description: `Limiar: ${[work, recoveries, remaining].filter(Boolean).join('; ')} na parte principal.`,
      segments: repeatedWorkSegments(
        set,
        paces.thresholdSecondsPerKm,
        paces.easySecondsPerKm,
        'Limiar',
      ),
    };
  }
  if (qualityType === 'interval') {
    const workPaceSecondsPerKm = racePaceSecondsPerKm ?? paces.intervalSecondsPerKm;
    const workPace = `${formatPace(workPaceSecondsPerKm)} min/km`;
    const workPhase = racePaceSecondsPerKm === undefined ? 'work' : 'race-pace';
    const workDescription =
      racePaceSecondsPerKm === undefined ? 'Tiro' : 'Ritmo de prova';
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
    const work = `${set.repetitions} × ${set.work.label} a ${workPace} (${formatDistance(set.work.distanceHundredths)} por repetição)`;
    const recoveries =
      set.recoveryCount > 0
        ? `${set.recoveryCount} × ${set.recovery.label} de recuperação leve a ${easyPace} (${formatDistance(set.recovery.distanceHundredths)})`
        : undefined;
    const remaining =
      set.remainingHundredths > 0
        ? `${formatDistance(set.remainingHundredths)} leve para completar ${mainDistance}`
        : undefined;

    return {
      description: `Tiros/intervalado: ${[work, recoveries, remaining].filter(Boolean).join('; ')} na parte principal.`,
      segments: repeatedWorkSegments(
        set,
        workPaceSecondsPerKm,
        paces.easySecondsPerKm,
        workDescription,
        workPhase,
      ),
    };
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

    const segments: WorkoutSegment[] = [];
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      segments.push(
        makeSegment('work', fastHundredths, paces.intervalSecondsPerKm, 'Rápido'),
        makeSegment('recovery', easyHundredths, paces.easySecondsPerKm, 'Recuperação leve'),
      );
    }
    if (remainingHundredths > 0) {
      segments.push(
        makeSegment('easy', remainingHundredths, paces.easySecondsPerKm, 'Leve extra'),
      );
    }

    return {
      description: `Fartlek: ${[cycleDescription, remaining].filter(Boolean).join('; ')} para completar ${mainDistance} na parte principal.`,
      segments,
    };
  }

  const midpointPaceSecondsPerKm = Math.round(
    (paces.easySecondsPerKm + paces.thresholdSecondsPerKm) / 2,
  );
  const easyHundredths = Math.floor(mainHundredths * 0.4 + 1e-8);
  const midpointHundredths = Math.floor(mainHundredths * 0.4 + 1e-8);
  const thresholdHundredths = mainHundredths - easyHundredths - midpointHundredths;
  const finalPaceSecondsPerKm = racePaceSecondsPerKm ?? paces.thresholdSecondsPerKm;
  const finalPhase = racePaceSecondsPerKm === undefined ? 'work' : 'race-pace';
  const finalLabel = racePaceSecondsPerKm === undefined ? 'Limiar' : 'Ritmo de prova';
  const finalDescription =
    racePaceSecondsPerKm === undefined
      ? `${formatDistance(thresholdHundredths)} em limiar a ${thresholdPace}`
      : `${formatDistance(thresholdHundredths)} em ritmo de prova a ${formatPace(finalPaceSecondsPerKm)} min/km`;

  return {
    description: `Progressivo: ${formatDistance(easyHundredths)} leve a ${easyPace}, ${formatDistance(midpointHundredths)} moderado a ${formatPace(midpointPaceSecondsPerKm)} min/km e ${finalDescription}.`,
    segments: [
      makeSegment('easy', easyHundredths, paces.easySecondsPerKm, 'Leve'),
      makeSegment('moderate', midpointHundredths, midpointPaceSecondsPerKm, 'Moderado'),
      makeSegment(finalPhase, thresholdHundredths, finalPaceSecondsPerKm, finalLabel),
    ],
  };
}

function sessionPaceAndDescription(
  type: WorkoutSession['type'],
  qualityType: QualityWorkoutType | undefined,
  mainHundredths: number,
  paces: PaceTargets,
  racePaceSecondsPerKm?: number,
): { paceSecondsPerKm: number; description: string; mainSegments: WorkoutSegment[] } {
  if (type === 'easy') {
    return {
      paceSecondsPerKm: paces.easySecondsPerKm,
      description: 'Corrida leve para acumular volume com conforto.',
      mainSegments: [makeSegment('easy', mainHundredths, paces.easySecondsPerKm, 'Leve')],
    };
  }
  if (type === 'long') {
    return {
      paceSecondsPerKm: paces.easySecondsPerKm,
      description: 'Corrida longa em ritmo leve, sem forçar.',
      mainSegments: [makeSegment('easy', mainHundredths, paces.easySecondsPerKm, 'Leve contínuo')],
    };
  }
  if (!qualityType) {
    throw new Error('Uma sessão de qualidade precisa de um subtipo.');
  }

  const prescription = qualityPrescription(
    qualityType,
    mainHundredths,
    paces,
    racePaceSecondsPerKm,
  );
  return {
    paceSecondsPerKm: qualityPaceSecondsPerKm(qualityType, paces),
    description: prescription.description,
    mainSegments: prescription.segments,
  };
}

function sessionSegments(
  warmupHundredths: number,
  mainSegments: WorkoutSegment[],
  cooldownHundredths: number,
  easyPaceSecondsPerKm: number,
): WorkoutSegment[] {
  return [
    makeSegment('warmup', warmupHundredths, easyPaceSecondsPerKm, 'Aquecimento'),
    ...mainSegments,
    makeSegment('cooldown', cooldownHundredths, easyPaceSecondsPerKm, 'Desaquecimento'),
  ];
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

  if (weeks.length < requiredWeeks) {
    warnings.push(
      `O ciclo de ${weeks.length} semanas é curto para a distância escolhida; não tente compensar aumentando a carga rapidamente.`,
    );
  }
  if (weeks.length < 4) {
    warnings.push(
      'O ciclo tem menos de quatro semanas; mantenha a carga sem aumentos para tentar compensar o prazo curto.',
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

function assignTrainingPhases(weekCount: number): TrainingPhase[] {
  if (weekCount === 0) return [];
  if (weekCount < 4) {
    return [...Array.from({ length: weekCount - 1 }, () => 'base' as const), 'taper'];
  }

  const baseWeeks = Math.max(1, Math.floor(weekCount * 0.25));
  const developmentWeeks = Math.max(1, Math.floor(weekCount * 0.3));
  const specificWeeks = weekCount - baseWeeks - developmentWeeks - 1;

  return [
    ...Array.from({ length: baseWeeks }, () => 'base' as const),
    ...Array.from({ length: developmentWeeks }, () => 'development' as const),
    ...Array.from({ length: specificWeeks }, () => 'specific' as const),
    'taper',
  ];
}

function isSpecificRacePaceWorkout(
  phase: TrainingPhase,
  qualityType: QualityWorkoutType | undefined,
): boolean {
  return phase === 'specific' && (qualityType === 'interval' || qualityType === 'progressive');
}

export function buildTrainingPlan(
  profile: RunnerProfile,
  paces: PaceTargets,
  today: Date,
): TrainingPlan {
  const calendarWeeks = getCalendarWeekWindows(today, profile.raceDate);
  const phases = assignTrainingPhases(calendarWeeks.length);
  const goalAssessment = assessRaceGoal(profile, paces);
  const growthRate = 0.05;
  const weeks: TrainingWeek[] = [];
  let phasesShortened = false;
  let qualityChangedToEasy = false;
  let peakWeeklyDistanceHundredths = toHundredthsFloor(profile.currentWeeklyKm);

  for (let weekNumber = 1; weekNumber <= calendarWeeks.length; weekNumber += 1) {
    const calendarWeek: CalendarWeekWindow = calendarWeeks[weekNumber - 1];
    const phase = phases[weekNumber - 1];
    let targetWeeklyDistanceHundredths = peakWeeklyDistanceHundredths;

    if (phase === 'taper') {
      targetWeeklyDistanceHundredths = Math.floor(peakWeeklyDistanceHundredths * 0.6 + 1e-8);
    } else if (calendarWeeks.length >= 4 && weekNumber > 1 && weekNumber % 4 === 0) {
      targetWeeklyDistanceHundredths = Math.floor(peakWeeklyDistanceHundredths * 0.8 + 1e-8);
    } else if (calendarWeeks.length >= 4 && weekNumber > 1) {
      targetWeeklyDistanceHundredths = Math.floor(
        peakWeeklyDistanceHundredths * (1 + growthRate) + 1e-8,
      );
      peakWeeklyDistanceHundredths = targetWeeklyDistanceHundredths;
    }

    targetWeeklyDistanceHundredths = Math.floor(
      (targetWeeklyDistanceHundredths * calendarWeek.availableTrainingDays) / 7 + 1e-8,
    );
    const types = sessionTypes(
      Math.min(profile.sessionsPerWeek, calendarWeek.availableTrainingDays),
    );
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
        const racePaceSecondsPerKm = isSpecificRacePaceWorkout(phase, qualityType)
          ? goalAssessment.prescribedRacePaceSecondsPerKm
          : undefined;
        const { paceSecondsPerKm, description, mainSegments } = sessionPaceAndDescription(
          type,
          qualityType,
          mainHundredths,
          paces,
          racePaceSecondsPerKm,
        );

        return {
          week: weekNumber,
          session: 0,
          type,
          qualityType,
          segments: sessionSegments(
            fittedPhases.warmupHundredths,
            mainSegments,
            fittedPhases.cooldownHundredths,
            paces.easySecondsPerKm,
          ),
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
      phase,
      startDate: calendarWeek.startDate,
      endDate: calendarWeek.endDate,
      weeklyDistanceKm: distances.reduce((total, distance) => total + distance, 0) / 100,
      sessions,
    });
  }

  const warnings = buildWarnings(profile, weeks);
  if (goalAssessment.ambitious) {
    warnings.push(
      'A meta de prova é ambiciosa em relação à estimativa atual; nos blocos específicos, o ritmo foi limitado ao intervalo seguro.',
    );
  }
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
