import { getBmiTrainingGuidance } from '../domain/bmi';
import { formatPace, PACE_RANGE_WARNING, type PaceTargets } from '../domain/paces';
import type { RunnerProfile } from '../domain/profile';
import type {
  QualityWorkoutType,
  TrainingPhase,
  TrainingPlan,
  WorkoutSession,
} from '../domain/trainingPlan';
import { formatCompleteWorkout } from '../domain/workoutText';
import WorkoutTimeline, { WorkoutTimelineLegend } from './WorkoutTimeline';

interface TrainingPreviewProps {
  profile: RunnerProfile;
  paces: PaceTargets;
  bmi: number;
  plan: TrainingPlan;
}

const targetNames: Record<RunnerProfile['targetDistanceKm'], string> = {
  3: '3 km',
  5: '5 km',
  10: '10 km',
  21.1: 'meia maratona (21,1 km)',
  42.2: 'maratona (42,2 km)',
};

const qualityNames: Record<QualityWorkoutType, string> = {
  threshold: 'Limiar',
  interval: 'Intervalado',
  fartlek: 'Fartlek',
  progressive: 'Progressivo',
};

const phaseNames: Record<TrainingPhase, string> = {
  base: 'Base',
  development: 'Desenvolvimento',
  specific: 'Específica',
  taper: 'Polimento',
};

function formatDistance(distanceKm: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(distanceKm);
}

function formatGoalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

function formatRaceDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

function formatWorkoutType(session: WorkoutSession): string {
  if (session.type === 'quality') {
    return session.qualityType ? `Qualidade · ${qualityNames[session.qualityType]}` : 'Qualidade';
  }
  return session.type === 'long' ? 'Longo' : 'Leve';
}

export default function TrainingPreview({ profile, paces, bmi, plan }: TrainingPreviewProps) {
  const formattedBmi = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(bmi);
  const bmiGuidance = getBmiTrainingGuidance(bmi);

  return (
    <section className="preview-card" aria-labelledby="plan-title" aria-live="polite">
      <div className="section-heading">
        <p className="eyebrow">SEU CICLO DE TREINO</p>
        <h2 id="plan-title">Plano semanal</h2>
        <p>
          {targetNames[profile.targetDistanceKm]} · {plan.weeks.length} semanas ·{' '}
          {profile.sessionsPerWeek} sessões por semana
        </p>
      </div>

      <aside className="race-event" aria-label="Evento da prova">
        <p className="eyebrow">EVENTO</p>
        <h3>Prova</h3>
        <p>
          {formatRaceDate(profile.raceDate)} · Meta: {formatGoalTime(profile.goalTimeSeconds)}
        </p>
      </aside>

      {paces.clamped && (
        <p className="notice" role="status">
          {PACE_RANGE_WARNING}
        </p>
      )}
      {plan.warnings.map((warning) => (
        <p className="notice" key={warning} role="status">
          {warning}
        </p>
      ))}

      <div className="pace-grid" aria-label="Ritmos de treino">
        <article className="pace-card pace-easy">
          <span>LEVE</span>
          <strong>Ritmo leve: {formatPace(paces.easySecondsPerKm)} min/km</strong>
        </article>
        <article className="pace-card pace-threshold">
          <span>LIMIAR</span>
          <strong>Ritmo de limiar: {formatPace(paces.thresholdSecondsPerKm)} min/km</strong>
        </article>
        <article className="pace-card pace-interval">
          <span>TIRO</span>
          <strong>Ritmo de tiro: {formatPace(paces.intervalSecondsPerKm)} min/km</strong>
        </article>
      </div>

      <p className="bmi-note preview-bmi">
        IMC informativo: <strong>{formattedBmi}</strong>
        <span> O IMC não é usado para definir carga ou ritmo.</span>
      </p>
      {profile.adultConfirmed && bmiGuidance && (
        <p className="notice" role="status">
          {bmiGuidance}
        </p>
      )}

      <WorkoutTimelineLegend />
      <div className="table-scroll">
        <table>
          <caption>Treinos por semana</caption>
          <thead>
            <tr>
              <th scope="col">Semana</th>
              <th scope="col">Sessão</th>
              <th scope="col">Distância total</th>
              <th scope="col">Ritmo-alvo</th>
              <th scope="col">Treino principal</th>
              <th scope="col">Estrutura visual</th>
            </tr>
          </thead>
          <tbody>
            {plan.weeks.flatMap((week) =>
              week.sessions.map((session) => (
                <tr key={`${session.week}-${session.session}`}>
                  <th scope="row">
                    <span>Semana {week.week}</span> · {phaseNames[week.phase]}
                    {' · '}
                    <br />
                    <span>
                      {formatRaceDate(week.startDate)} – {formatRaceDate(week.endDate)}
                    </span>
                  </th>
                  <td>
                    Treino {session.session} · {formatWorkoutType(session)}
                  </td>
                  <td>{formatDistance(session.distanceKm)} km</td>
                  <td>{formatPace(session.paceSecondsPerKm)} min/km</td>
                  <td>{formatCompleteWorkout(session)}</td>
                  <td>
                    <WorkoutTimeline segments={session.segments} />
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <p className="disclaimer">
        Os ritmos são estimativas baseadas na sua marca de 5 km. Ajuste o esforço ao seu conforto;
        reduza ou interrompa o treino diante de dor ou fadiga persistente e procure orientação
        apropriada.
      </p>
    </section>
  );
}
