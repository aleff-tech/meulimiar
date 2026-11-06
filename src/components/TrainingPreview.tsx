import { formatPace, PACE_RANGE_WARNING, type PaceTargets } from '../domain/paces';
import type { RunnerProfile } from '../domain/profile';
import { formatDuration } from '../domain/time';
import type { QualityWorkoutType, TrainingPlan, WorkoutSession } from '../domain/trainingPlan';

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

function formatDistance(distanceKm: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(distanceKm);
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

      <div className="table-scroll">
        <table>
          <caption>Treinos por semana</caption>
          <thead>
            <tr>
              <th scope="col">Semana</th>
              <th scope="col">Sessão</th>
              <th scope="col">Distância total</th>
              <th scope="col">Ritmo-alvo</th>
              <th scope="col">Aquecimento</th>
              <th scope="col">Treino principal</th>
              <th scope="col">Desaquecimento</th>
            </tr>
          </thead>
          <tbody>
            {plan.weeks.flatMap((week) =>
              week.sessions.map((session) => (
                <tr key={`${session.week}-${session.session}`}>
                  <th scope="row">Semana {week.week}</th>
                  <td>
                    Treino {session.session} · {formatWorkoutType(session)}
                  </td>
                  <td>{formatDistance(session.distanceKm)} km</td>
                  <td>{formatPace(session.paceSecondsPerKm)} min/km</td>
                  <td>
                    {formatDuration(session.warmupDurationSeconds)} leve a{' '}
                    {formatPace(paces.easySecondsPerKm)} min/km ·{' '}
                    {formatDistance(session.warmupDistanceKm)} km
                  </td>
                  <td>
                    {session.type === 'quality'
                      ? session.description
                      : `${formatDistance(session.mainDistanceKm)} km · ${session.description}`}
                  </td>
                  <td>
                    {formatDuration(session.cooldownDurationSeconds)} leve a{' '}
                    {formatPace(paces.easySecondsPerKm)} min/km ·{' '}
                    {formatDistance(session.cooldownDistanceKm)} km
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
