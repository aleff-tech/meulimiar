import type { WorkoutSegment, WorkoutSession } from './trainingPlan';
import { formatPace } from './paces';

function intervalGroupKey(segment: WorkoutSegment): string | undefined {
  if (
    segment.phase !== 'work' &&
    segment.phase !== 'race-pace' &&
    segment.phase !== 'recovery'
  ) {
    return undefined;
  }

  return JSON.stringify([
    segment.phase,
    segment.label,
    segment.distanceKm,
    segment.paceSecondsPerKm,
  ]);
}

function compactSegmentLabel(segment: WorkoutSegment): string {
  if (segment.phase === 'warmup') return 'Aquec';
  if (segment.phase === 'cooldown') return 'Desaquec';
  if (segment.phase === 'work') return 'Tiros';
  if (segment.phase === 'recovery') return 'Recup';
  if (segment.phase === 'race-pace') return segment.label.split(':')[0];

  return segment.label.split(':')[0];
}

function formatCompactInterval(session: WorkoutSession): string {
  const counts = new Map<string, number>();
  for (const segment of session.segments) {
    const key = intervalGroupKey(segment);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const emitted = new Set<string>();
  const summaries: string[] = [];

  for (const segment of session.segments) {
    const key = intervalGroupKey(segment);
    if (key && emitted.has(key)) continue;
    if (key) emitted.add(key);

    const count = key ? `${counts.get(key)}x ` : '';
    summaries.push(
      `${count}${compactSegmentLabel(segment)}: ${segment.distanceKm.toFixed(2)} km (${formatPace(segment.paceSecondsPerKm)} min/km)`,
    );
  }

  return summaries.join(' · ');
}

export function formatCompleteWorkout(session: WorkoutSession): string {
  const distance = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(session.distanceKm);
  const summary =
    session.type === 'long'
      ? `${distance} km a ${formatPace(session.paceSecondsPerKm)} min/km`
      : `${distance} km`;
  const isInterval =
    session.type === 'quality' && session.qualityType === 'interval';
  const details =
    isInterval
      ? formatCompactInterval(session)
      : session.segments.map(({ label }) => label).join('. ');
  const separator = isInterval ? ' · ' : '. ';

  return details ? `${summary}${separator}${details}` : summary;
}
