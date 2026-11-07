import { describe, expect, it } from 'vitest';
import type { WorkoutSegment, WorkoutSession } from './trainingPlan';
import { formatCompleteWorkout } from './workoutText';

function createSession(
  type: WorkoutSession['type'],
  distanceKm: number,
  paceSecondsPerKm: number,
  segments: WorkoutSegment[],
): WorkoutSession {
  return {
    week: 1,
    session: 1,
    type,
    segments,
    distanceKm,
    paceSecondsPerKm,
    description: 'Treino de teste',
    warmupDistanceKm: segments.find(({ phase }) => phase === 'warmup')?.distanceKm ?? 0,
    warmupDurationSeconds: 0,
    mainDistanceKm: segments
      .filter(({ phase }) => phase !== 'warmup' && phase !== 'cooldown')
      .reduce((total, segment) => total + segment.distanceKm, 0),
    cooldownDistanceKm: segments.find(({ phase }) => phase === 'cooldown')?.distanceKm ?? 0,
    cooldownDurationSeconds: 0,
  };
}

function createIntervalSession(distanceKm: number, segments: WorkoutSegment[]): WorkoutSession {
  return {
    ...createSession('quality', distanceKm, 400, segments),
    qualityType: 'interval',
  };
}

function createSegment(
  phase: WorkoutSegment['phase'],
  distanceKm: number,
  paceSecondsPerKm: number,
  label: string,
): WorkoutSegment {
  return { phase, distanceKm, paceSecondsPerKm, label };
}

describe('formatCompleteWorkout', () => {
  it('summarizes long-run total distance and pace before ordered segments', () => {
    const session = createSession('long', 4.75, 400, [
      {
        phase: 'warmup',
        distanceKm: 0.5,
        paceSecondsPerKm: 400,
        label: 'Aquecimento: 0,50 km a 6:40 min/km',
      },
      {
        phase: 'easy',
        distanceKm: 3.75,
        paceSecondsPerKm: 400,
        label: 'Corrida longa: 3,75 km a 6:40 min/km',
      },
      {
        phase: 'cooldown',
        distanceKm: 0.5,
        paceSecondsPerKm: 400,
        label: 'Desaquecimento: 0,50 km a 6:40 min/km',
      },
    ]);

    expect(formatCompleteWorkout(session)).toBe(
      '4,75 km a 6:40 min/km. Aquecimento: 0,50 km a 6:40 min/km. Corrida longa: 3,75 km a 6:40 min/km. Desaquecimento: 0,50 km a 6:40 min/km',
    );
  });

  it('summarizes easy-run distance without adding a single-pace summary', () => {
    const session = createSession('easy', 3.25, 400, [
      {
        phase: 'warmup',
        distanceKm: 0.5,
        paceSecondsPerKm: 400,
        label: 'Aquecimento: 0,50 km a 6:40 min/km',
      },
      {
        phase: 'easy',
        distanceKm: 2.25,
        paceSecondsPerKm: 400,
        label: 'Corrida leve: 2,25 km a 6:40 min/km',
      },
      {
        phase: 'cooldown',
        distanceKm: 0.5,
        paceSecondsPerKm: 400,
        label: 'Desaquecimento: 0,50 km a 6:40 min/km',
      },
    ]);

    expect(formatCompleteWorkout(session)).toBe(
      '3,25 km. Aquecimento: 0,50 km a 6:40 min/km. Corrida leve: 2,25 km a 6:40 min/km. Desaquecimento: 0,50 km a 6:40 min/km',
    );
  });

  it('summarizes quality-workout distance without implying one overall pace', () => {
    const session = createSession('quality', 5, 400, [
      {
        phase: 'warmup',
        distanceKm: 1,
        paceSecondsPerKm: 400,
        label: 'Aquecimento: 1,00 km a 6:40 min/km',
      },
      {
        phase: 'work',
        distanceKm: 2,
        paceSecondsPerKm: 255,
        label: 'Tiros: 2,00 km a 4:15 min/km',
      },
      {
        phase: 'recovery',
        distanceKm: 1,
        paceSecondsPerKm: 400,
        label: 'Recuperação: 1,00 km a 6:40 min/km',
      },
      {
        phase: 'cooldown',
        distanceKm: 1,
        paceSecondsPerKm: 400,
        label: 'Desaquecimento: 1,00 km a 6:40 min/km',
      },
    ]);

    expect(formatCompleteWorkout(session)).toBe(
      '5,00 km. Aquecimento: 1,00 km a 6:40 min/km. Tiros: 2,00 km a 4:15 min/km. Recuperação: 1,00 km a 6:40 min/km. Desaquecimento: 1,00 km a 6:40 min/km',
    );
  });

  it('compacts repeated interval segments with exact work and recovery counts', () => {
    const warmup = createSegment('warmup', 1.5, 400, 'Aquecimento: 1.50 km a 6:40 min/km');
    const work = createSegment('work', 0.2, 290, 'Tiro: 0.20 km a 4:50 min/km');
    const recovery = createSegment(
      'recovery',
      0.15,
      400,
      'Recuperação leve: 0.15 km a 6:40 min/km',
    );
    const intervalSegments = Array.from({ length: 15 }, (_, index) =>
      index < 14 ? [work, recovery] : [work],
    ).flat();
    const segments = [
      warmup,
      ...intervalSegments,
      createSegment('easy', 0.3, 400, 'Leve extra: 0.30 km a 6:40 min/km'),
      createSegment('cooldown', 0.75, 400, 'Desaquecimento: 0.75 km a 6:40 min/km'),
    ];
    const session = createIntervalSession(7.65, segments);

    expect(formatCompleteWorkout(session)).toBe(
      '7,65 km · Aquec: 1.50 km (6:40 min/km) · 15x Tiros: 0.20 km (4:50 min/km) · 14x Recup: 0.15 km (6:40 min/km) · Leve extra: 0.30 km (6:40 min/km) · Desaquec: 0.75 km (6:40 min/km)',
    );
  });

  it('does not add a recovery count when an interval has no recovery segments', () => {
    const session = createIntervalSession(1.5, [
      createSegment('warmup', 0.5, 400, 'Aquecimento: 0.50 km a 6:40 min/km'),
      createSegment('work', 0.2, 290, 'Tiro: 0.20 km a 4:50 min/km'),
      createSegment('easy', 0.3, 400, 'Leve extra: 0.30 km a 6:40 min/km'),
      createSegment('cooldown', 0.5, 400, 'Desaquecimento: 0.50 km a 6:40 min/km'),
    ]);

    expect(formatCompleteWorkout(session)).toBe(
      '1,50 km · Aquec: 0.50 km (6:40 min/km) · 1x Tiros: 0.20 km (4:50 min/km) · Leve extra: 0.30 km (6:40 min/km) · Desaquec: 0.50 km (6:40 min/km)',
    );
  });

  it('keeps specific race-pace interval work labeled as race pace', () => {
    const session = createIntervalSession(1.55, [
      createSegment('warmup', 0.5, 400, 'Aquecimento: 0.50 km a 6:40 min/km'),
      createSegment('race-pace', 0.2, 300, 'Ritmo de prova: 0.20 km a 5:00 min/km'),
      createSegment('recovery', 0.15, 400, 'Recuperação leve: 0.15 km a 6:40 min/km'),
      createSegment('race-pace', 0.2, 300, 'Ritmo de prova: 0.20 km a 5:00 min/km'),
      createSegment('cooldown', 0.5, 400, 'Desaquecimento: 0.50 km a 6:40 min/km'),
    ]);

    expect(formatCompleteWorkout(session)).toBe(
      '1,55 km · Aquec: 0.50 km (6:40 min/km) · 2x Ritmo de prova: 0.20 km (5:00 min/km) · 1x Recup: 0.15 km (6:40 min/km) · Desaquec: 0.50 km (6:40 min/km)',
    );
  });

  it('leaves non-interval quality workouts unchanged', () => {
    const session = {
      ...createSession('quality', 5, 400, [
        createSegment('warmup', 1, 400, 'Aquecimento: 1.00 km a 6:40 min/km'),
        createSegment('work', 2, 255, 'Limiar: 2.00 km a 4:15 min/km'),
        createSegment('recovery', 1, 400, 'Recuperação leve: 1.00 km a 6:40 min/km'),
        createSegment('cooldown', 1, 400, 'Desaquecimento: 1.00 km a 6:40 min/km'),
      ]),
      qualityType: 'threshold' as const,
    };

    expect(formatCompleteWorkout(session)).toBe(
      '5,00 km. Aquecimento: 1.00 km a 6:40 min/km. Limiar: 2.00 km a 4:15 min/km. Recuperação leve: 1.00 km a 6:40 min/km. Desaquecimento: 1.00 km a 6:40 min/km',
    );
  });
});
