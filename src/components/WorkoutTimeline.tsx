import type { WorkoutSegment, WorkoutSegmentPhase } from '../domain/trainingPlan';
import { formatDuration } from '../domain/time';

const legendPhases: { phase: WorkoutSegmentPhase; label: string }[] = [
  { phase: 'warmup', label: 'Aquecimento' },
  { phase: 'easy', label: 'Leve' },
  { phase: 'work', label: 'Trabalho' },
  { phase: 'recovery', label: 'Recuperação' },
  { phase: 'moderate', label: 'Moderado' },
  { phase: 'cooldown', label: 'Desaquecimento' },
  { phase: 'race-pace', label: 'Ritmo de prova' },
];

interface WorkoutTimelineProps {
  segments: WorkoutSegment[];
}

const speedFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function WorkoutTimeline({ segments }: WorkoutTimelineProps) {
  return (
    <div
      className="workout-timeline-chart"
      role="img"
      aria-label={`Escala de velocidade de 0 a 20 km/h. ${segments
        .map((segment) => {
          const speedKmPerHour = 3600 / segment.paceSecondsPerKm;
          const durationSeconds = segment.distanceKm * segment.paceSecondsPerKm;
          return `${segment.label}. Duração ${formatDuration(durationSeconds)}. Velocidade ${speedFormatter.format(speedKmPerHour)} km/h`;
        })
        .join('. ')}`}
    >
      <div className="workout-timeline__axis" aria-hidden="true">
        <span>20 km/h</span>
        <span>0 km/h</span>
      </div>
      <div className="workout-timeline" aria-hidden="true">
        {segments.map((segment, index) => {
          const speedKmPerHour = 3600 / segment.paceSecondsPerKm;
          const durationSeconds = segment.distanceKm * segment.paceSecondsPerKm;

          return (
            <span
              key={`${segment.phase}-${index}`}
              className={`workout-timeline__segment workout-phase--${segment.phase}`}
              data-phase={segment.phase}
              title={`${segment.label} · ${formatDuration(durationSeconds)} · ${speedFormatter.format(speedKmPerHour)} km/h`}
              style={{
                flexGrow: durationSeconds,
                flexBasis: 0,
                height: `${Math.min((speedKmPerHour / 20) * 100, 100)}%`,
              }}
            />
          );
        })}
      </div>
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
