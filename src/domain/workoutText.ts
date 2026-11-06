import type { WorkoutSession } from './trainingPlan';

export function formatCompleteWorkout(session: WorkoutSession): string {
  return session.segments.map(({ label }) => label).join('. ');
}
