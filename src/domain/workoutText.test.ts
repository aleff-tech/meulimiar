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
});
