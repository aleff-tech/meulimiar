import * as XLSX from 'xlsx';
import { describe, expect, it, vi } from 'vitest';
import { calculatePaces } from '../domain/paces';
import type { RunnerProfile } from '../domain/profile';
import { buildTrainingPlan } from '../domain/trainingPlan';
import { createTrainingWorkbook, downloadTrainingWorkbook } from './workbook';

const profile: RunnerProfile = {
  targetDistanceKm: 10,
  fiveKmTimeSeconds: 1350,
  weightKg: 70,
  heightCm: 175,
  currentWeeklyKm: 30,
  sessionsPerWeek: 4,
  weeksAvailable: 8,
  preference: 'light',
};

const paces = calculatePaces(profile.fiveKmTimeSeconds);
const plan = buildTrainingPlan(profile, paces);

describe('createTrainingWorkbook', () => {
  it('creates summary and weekly-plan sheets with the runner data', () => {
    const workbook = createTrainingWorkbook(profile, paces, 22.9, plan);

    expect(workbook.SheetNames).toEqual(['Resumo', 'Plano semanal']);
    const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Resumo, {
      header: 1,
    });
    const planRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Plano semanal'], {
      header: 1,
    });

    expect(summaryRows).toContainEqual(['Distância-alvo (km)', 10]);
    expect(summaryRows).toContainEqual(['IMC informativo', 22.9]);
    expect(summaryRows).toContainEqual(['Ritmo leve', '6:00 min/km']);
    expect(summaryRows).toContainEqual(['Ritmo de limiar', '4:45 min/km']);
    expect(summaryRows).toContainEqual(['Ritmo de tiro', '4:25 min/km']);
    expect(planRows).toHaveLength(1 + 8 * 4);
    expect(planRows.find((row) => row[2] === 'Leve')).toContain('6:00 min/km');
    expect(planRows.some((row) => row[0] === 8)).toBe(true);
  });

  it('preserves sheet names and representative cells after XLSX round-trip', () => {
    const workbook = createTrainingWorkbook(profile, paces, 22.9, plan);
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const reopened = XLSX.read(bytes, { type: 'array' });
    const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(reopened.Sheets.Resumo, {
      header: 1,
    });

    expect(reopened.SheetNames).toEqual(['Resumo', 'Plano semanal']);
    expect(summaryRows).toContainEqual(['Distância-alvo (km)', 10]);
    expect(summaryRows).toContainEqual(['IMC informativo', 22.9]);
  });

  it('exports the pace-range warning in the summary after XLSX round-trip', () => {
    const clampedProfile = { ...profile, fiveKmTimeSeconds: 2700 };
    const clampedPaces = calculatePaces(clampedProfile.fiveKmTimeSeconds);
    const clampedPlan = buildTrainingPlan(clampedProfile, clampedPaces);
    const workbook = createTrainingWorkbook(clampedProfile, clampedPaces, 22.9, clampedPlan);
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const reopened = XLSX.read(bytes, { type: 'array' });
    const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(reopened.Sheets.Resumo, {
      header: 1,
    });

    expect(summaryRows).toContainEqual([
      'Aviso',
      'Seus ritmos foram limitados à faixa de referência de 20:00 a 25:00 nos 5 km e podem não refletir seu esforço; ajuste pelo conforto.',
    ]);
  });

  it('preserves two-decimal session distances as formatted numeric cells', () => {
    const lowBaseProfile = {
      ...profile,
      currentWeeklyKm: 1,
      sessionsPerWeek: 1,
      weeksAvailable: 4,
    };
    const lowBasePlan = buildTrainingPlan(lowBaseProfile, paces);
    const workbook = createTrainingWorkbook(lowBaseProfile, paces, 22.9, lowBasePlan);
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const reopened = XLSX.read(bytes, { type: 'array', cellNF: true });
    const weekTwoDistance = reopened.Sheets['Plano semanal']['D3'];

    expect(weekTwoDistance?.v).toBe(1.05);
    expect(weekTwoDistance?.z).toBe('0.00');
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
