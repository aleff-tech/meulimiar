import * as XLSX from 'xlsx';
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

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => part.toString().padStart(2, '0')).join(':');
}

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

function formatWorkoutType(session: WorkoutSession): string {
  if (session.type === 'quality') {
    return session.qualityType ? `Qualidade · ${qualityNames[session.qualityType]}` : 'Qualidade';
  }
  if (session.type === 'long') return 'Longo';
  return 'Leve';
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function createTrainingWorkbook(
  profile: RunnerProfile,
  paces: PaceTargets,
  bmi: number,
  plan: TrainingPlan,
): XLSX.WorkBook {
  const bmiGuidance = profile.adultConfirmed ? getBmiTrainingGuidance(bmi) : null;
  const summaryRows: (string | number)[][] = [
    ['Campo', 'Valor'],
    ['Distância-alvo (km)', profile.targetDistanceKm],
    ['Tempo recente nos 5 km', formatTime(profile.fiveKmTimeSeconds)],
    ['Tempo-alvo da prova', formatTime(profile.goalTimeSeconds)],
    ['Data da prova', formatDate(profile.raceDate)],
    ...(profile.adultConfirmed
      ? [['Confirmação de maioridade', 'Sim'] as (string | number)[]]
      : []),
    ['Peso (kg)', profile.weightKg],
    ['Altura (cm)', profile.heightCm],
    ['IMC informativo', bmi],
    ...(bmiGuidance ? [['Aviso sobre IMC', bmiGuidance] as (string | number)[]] : []),
    ['Km corridos por semana', profile.currentWeeklyKm],
    ['Sessões por semana', profile.sessionsPerWeek],
    ['Duração do ciclo (semanas)', plan.weeks.length],
    ['Ritmo leve', `${formatPace(paces.easySecondsPerKm)} min/km`],
    ['Ritmo de limiar', `${formatPace(paces.thresholdSecondsPerKm)} min/km`],
    ['Ritmo de tiro', `${formatPace(paces.intervalSecondsPerKm)} min/km`],
    ...(paces.clamped ? [['Aviso', PACE_RANGE_WARNING] as (string | number)[]] : []),
    ...plan.warnings.map((warning): (string | number)[] => ['Aviso', warning]),
  ];

  const calendarRows: (string | number)[][] = [
    [
      'Semana',
      'Sessão',
      'Tipo de treino',
      'Distância (km)',
      'Ritmo-alvo (min/km)',
      'Período',
      'Fase',
      'Treino completo',
    ],
    ...plan.weeks.flatMap((week) =>
      week.sessions.map((session) => [
        week.week,
        `Treino ${session.session}`,
        formatWorkoutType(session),
        session.distanceKm,
        `${formatPace(session.paceSecondsPerKm)} min/km`,
        `${formatDate(week.startDate)} – ${formatDate(week.endDate)}`,
        phaseNames[week.phase],
        formatCompleteWorkout(session),
      ]),
    ),
    ['', 'Prova', '', '', '', `Data da prova: ${formatDate(profile.raceDate)}`, '', 'Evento da prova'],
  ];

  const summary = XLSX.utils.aoa_to_sheet(summaryRows);
  summary['!cols'] = [{ wch: 30 }, { wch: 64 }];

  const calendar = XLSX.utils.aoa_to_sheet(calendarRows);
  for (let row = 2; row <= calendarRows.length; row += 1) {
    const distanceCell = calendar[`D${row}`];
    if (distanceCell) distanceCell.z = '0.00';
  }
  calendar['!cols'] = [
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 17 },
    { wch: 23 },
    { wch: 25 },
    { wch: 20 },
    { wch: 90 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summary, 'Resumo');
  XLSX.utils.book_append_sheet(workbook, calendar, 'Plano semanal');

  return workbook;
}

export function downloadTrainingWorkbook(workbook: XLSX.WorkBook): void {
  XLSX.writeFile(workbook, 'planilha-de-corrida.xlsx', { bookType: 'xlsx' });
}
