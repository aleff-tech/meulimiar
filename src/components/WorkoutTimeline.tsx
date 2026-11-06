import type { WorkoutSegment, WorkoutSegmentPhase } from '../domain/trainingPlan';

const legendPhases: { phase: WorkoutSegmentPhase; label: string }[] = [
  { phase: 'warmup', label: 'Aquecimento' },
  { phase: 'easy', label: 'Leve' },
  { phase: 'work', label: 'Trabalho' },
  { phase: 'recovery', label: 'Recuperação' },
  { phase: 'moderate', label: 'Moderado' },
  { phase: 'cooldown', label: 'Desaquecimento' },
];

interface WorkoutTimelineProps {
  segments: WorkoutSegment[];
}

export default function WorkoutTimeline({ segments }: WorkoutTimelineProps) {
  return (
    <div
      className="workout-timeline"
      role="img"
      aria-label={segments.map((segment) => segment.label).join('. ')}
    >
      {segments.map((segment, index) => (
        <span
          key={`${segment.phase}-${index}`}
          className={`workout-timeline__segment workout-phase--${segment.phase}`}
          data-phase={segment.phase}
          title={segment.label}
          aria-hidden="true"
          style={{ flexGrow: segment.distanceKm, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}

export function WorkoutTimelineLegend() {
  return (
    <ul className="workout-timeline-legend" aria-label="Legenda da estrutura do treino">
      {legendPhases.map(({ phase, label }) => (
        <li key={phase}>
          <span className={`workout-timeline-legend__swatch workout-phase--${phase}`} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
