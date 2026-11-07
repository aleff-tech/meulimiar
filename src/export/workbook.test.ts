import * as XLSX from 'xlsx';
import { describe, expect, it, vi } from 'vitest';
import { getBmiTrainingGuidance } from '../domain/bmi';
import { calculatePaces, PACE_RANGE_WARNING } from '../domain/paces';
import type { RunnerProfile } from '../domain/profile';
import { buildTrainingPlan } from '../domain/trainingPlan';
import { formatCompleteWorkout } from '../domain/workoutText';
import { createTrainingWorkbook, downloadTrainingWorkbook } from './workbook';

const today = new Date(2026, 0, 5);
const profile: RunnerProfile = {
  targetDistanceKm: 10,
  fiveKmTimeSeconds: 1350,
  goalTimeSeconds: 50 * 60,
  weightKg: 70,
  heightCm: 175,
  currentWeeklyKm: 30,
  sessionsPerWeek: 4,
  raceDate: '2026-03-01',
  adultConfirmed: true,
};

const paces = calculatePaces(profile.fiveKmTimeSeconds);
const plan = buildTrainingPlan(profile, paces, today);

function reopenWorkbook(
  runnerProfile: RunnerProfile = profile,
  runnerPaces = calculatePaces(runnerProfile.fiveKmTimeSeconds),
  runnerPlan = buildTrainingPlan(runnerProfile, runnerPaces, today),
  bmi = 22.9,
) {
  const workbook = createTrainingWorkbook(runnerProfile, runnerPaces, bmi, runnerPlan);
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return XLSX.read(bytes, { type: 'array', cellNF: true });
}

function rowsFor(workbook: XLSX.WorkBook, sheetName: string) {
  return XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName], {
    header: 1,
  });
}

describe('createTrainingWorkbook', () => {
  it('exports goal and event details, cycle length, paces, BMI, alerts, and selected adult confirmation', () => {
    const clampedProfile = { ...profile, fiveKmTimeSeconds: 2700 };
    const clampedPaces = calculatePaces(clampedProfile.fiveKmTimeSeconds);
    const clampedPlan = buildTrainingPlan(clampedProfile, clampedPaces, today);
    const reopened = reopenWorkbook(clampedProfile, clampedPaces, clampedPlan, 30);
    const summaryRows = rowsFor(reopened, 'Resumo');

    expect(reopened.SheetNames).toEqual(['Resumo', 'Plano semanal']);
    expect(summaryRows).toContainEqual(['Distância-alvo (km)', 10]);
    expect(summaryRows).toContainEqual(['Tempo recente nos 5 km', '00:45:00']);
    expect(summaryRows).toContainEqual(['Tempo-alvo da prova', '00:50:00']);
    expect(summaryRows).toContainEqual(['Data da prova', '01/03/2026']);
    expect(summaryRows).toContainEqual(['Duração do ciclo (semanas)', clampedPlan.weeks.length]);
    expect(summaryRows).toContainEqual(['IMC informativo', 30]);
    expect(summaryRows).toContainEqual(['Confirmação de maioridade', 'Sim']);
    expect(summaryRows).toContainEqual(['Ritmo leve', '6:40 min/km']);
    expect(summaryRows).toContainEqual(['Ritmo de limiar', '5:15 min/km']);
    expect(summaryRows).toContainEqual(['Ritmo de tiro', '4:50 min/km']);
    expect(summaryRows).toContainEqual(['Aviso sobre IMC', getBmiTrainingGuidance(30)]);
    expect(summaryRows).toContainEqual(['Aviso', PACE_RANGE_WARNING]);
    for (const warning of clampedPlan.warnings) {
      expect(summaryRows).toContainEqual(['Aviso', warning]);
    }
    expect(summaryRows.some((row) => row[0] === 'Preferência de carga')).toBe(false);
  });

  it('omits adult-only BMI guidance and confirmation when adult confirmation is not selected', () => {
    const unconfirmedProfile = { ...profile, adultConfirmed: false };
    const reopened = reopenWorkbook(unconfirmedProfile, paces, plan, 30);
    const summaryRows = rowsFor(reopened, 'Resumo');

    expect(summaryRows).toContainEqual(['IMC informativo', 30]);
    expect(summaryRows.some((row) => row[0] === 'Aviso sobre IMC')).toBe(false);
    expect(summaryRows.some((row) => row[0] === 'Confirmação de maioridade')).toBe(false);
  });

  it('exports dated training weeks, phase, complete workouts, and a separate race event without a training session', () => {
    const reopened = reopenWorkbook();
    const summaryRows = rowsFor(reopened, 'Resumo');
    const rows = rowsFor(reopened, 'Plano semanal');
    const headers = rows[0];
    const sheet = reopened.Sheets['Plano semanal'];
    const trainingRows = rows.filter(
      (row) => typeof row[1] === 'string' && row[1].startsWith('Treino '),
    );
    const eventRow = rows.find((row) => row[1] === 'Prova');
    const firstWeek = plan.weeks[0];
    const qualitySession = firstWeek.sessions.find((session) => session.type === 'quality');
    const longSession = firstWeek.sessions.find((session) => session.type === 'long');
    const qualityRow = trainingRows.find(
      (row) => row[0] === firstWeek.week && row[1] === `Treino ${qualitySession?.session}`,
    );
    const longRow = trainingRows.find(
      (row) => row[0] === firstWeek.week && row[1] === `Treino ${longSession?.session}`,
    );

    expect(summaryRows).toContainEqual(['Data da prova', '01/03/2026']);
    expect(headers).toContain('Período');
    expect(headers).toContain('Fase');
    expect(headers).toContain('Treino completo');
    expect(headers).not.toContain('Aquecimento');
    expect(headers).not.toContain('Parte principal (km)');
    expect(headers).not.toContain('Desaquecimento');
    expect(rows[1]).toContain('05/01/2026 – 11/01/2026');
    expect(rows[1]).toContain('Base');
    expect(qualityRow?.[headers.indexOf('Treino completo')]).toBe(
      formatCompleteWorkout(qualitySession!),
    );
    expect(longSession).toBeDefined();
    expect(longRow?.[headers.indexOf('Treino completo')]).toBe(formatCompleteWorkout(longSession!));
    expect(longRow?.[headers.indexOf('Treino completo')]).toMatch(
      /^\d+,\d{2} km a \d+:\d{2} min\/km\./,
    );
    expect(eventRow?.[5]).toBe('Data da prova: 01/03/2026');
    expect(eventRow?.[2]).toBe('');
    expect(eventRow?.[3]).toBe('');
    expect(trainingRows).toHaveLength(plan.weeks.reduce((count, week) => count + week.sessions.length, 0));
    expect(eventRow).toBeDefined();
    expect(sheet.D2?.v).toBe(plan.weeks[0].sessions[0].distanceKm);
    expect(sheet.D2?.z).toBe('0.00');
  });

  it('preserves sheet names and representative cells after XLSX round-trip', () => {
    const reopened = reopenWorkbook();
    const summaryRows = rowsFor(reopened, 'Resumo');
    const weeklyRows = rowsFor(reopened, 'Plano semanal');
    const eventRow = weeklyRows.find((row) => row[1] === 'Prova');

    expect(reopened.SheetNames).toEqual(['Resumo', 'Plano semanal']);
    expect(summaryRows).toContainEqual(['Distância-alvo (km)', 10]);
    expect(summaryRows).toContainEqual(['IMC informativo', 22.9]);
    expect(eventRow?.[5]).toBe('Data da prova: 01/03/2026');
  });
});

describe('downloadTrainingWorkbook', () => {
  it('downloads the workbook with the expected XLSX filename', () => {
    const workbook = createTrainingWorkbook(profile, paces, 22.9, plan);
    const createObjectURL = vi.fn(() => 'blob:planilha-de-corrida');
    const createObjectURLDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revokeObjectURLDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const clickedAnchors: HTMLAnchorElement[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedAnchors.push(this);
    });

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: undefined,
    });

    try {
      downloadTrainingWorkbook(workbook);

      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toBe('planilha-de-corrida.xlsx');
      expect(clickedAnchors[0].href).toBe('blob:planilha-de-corrida');
    } finally {
      click.mockRestore();
      if (createObjectURLDescriptor) {
        Object.defineProperty(URL, 'createObjectURL', createObjectURLDescriptor);
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL');
      }
      if (revokeObjectURLDescriptor) {
        Object.defineProperty(URL, 'revokeObjectURL', revokeObjectURLDescriptor);
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL');
      }
    }
  });
});
