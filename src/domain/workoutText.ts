import type { WorkoutSession } from './trainingPlan';
import { formatPace } from './paces';

export function formatCompleteWorkout(session: WorkoutSession): string {
  const distance = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(session.distanceKm);
  const summary =
    session.type === 'long'
      ? `${distance} km a ${formatPace(session.paceSecondsPerKm)} min/km`
      : `${distance} km`;
  const details = session.segments.map(({ label }) => label).join('. ');

  return details ? `${summary}. ${details}` : summary;
}
