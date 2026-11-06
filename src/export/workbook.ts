import * as XLSX from 'xlsx';
import { formatPace, PACE_RANGE_WARNING, type PaceTargets } from '../domain/paces';
import type { RunnerProfile } from '../domain/profile';
import type { TrainingPlan } from '../domain/trainingPlan';

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => part.toString().padStart(2, '0')).join(':');
}

function formatWorkoutType(type: 'easy' | 'quality' | 'long'): string {
  if (type === 'quality') return 'Qualidade';
  if (type === 'long') return 'Longo';
  return 'Leve';
}

export function createTrainingWorkbook(
  profile: RunnerProfile,
  paces: PaceTargets,
  bmi: number,
  plan: TrainingPlan,
): XLSX.WorkBook {
  const summaryRows: (string | number)[][] = [
    ['Campo', 'Valor'],
    ['Distância-alvo (km)', profile.targetDistanceKm],
    ['Tempo recente nos 5 km', formatTime(profile.fiveKmTimeSeconds)],
    ['Peso (kg)', profile.weightKg],
    ['Altura (cm)', profile.heightCm],
    ['IMC informativo', bmi],
    ['Km corridos por semana', profile.currentWeeklyKm],
    ['Sessões por semana', profile.sessionsPerWeek],
    ['Semanas até a prova', profile.weeksAvailable],
    ['Preferência de carga', profile.preference === 'light' ? 'Mais leve' : 'Mais agressiva'],
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
      'Orientação',
    ],
    ...plan.weeks.flatMap((week) =>
      week.sessions.map((session) => [
        week.week,
        `Treino ${session.session}`,
        formatWorkoutType(session.type),
        session.distanceKm,
        `${formatPace(session.paceSecondsPerKm)} min/km`,
        session.description,
      ]),
    ),
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
    { wch: 58 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summary, 'Resumo');
  XLSX.utils.book_append_sheet(workbook, calendar, 'Plano semanal');

  return workbook;
}

export function downloadTrainingWorkbook(workbook: XLSX.WorkBook): void {
  XLSX.writeFile(workbook, 'planilha-de-corrida.xlsx', { bookType: 'xlsx' });
}
