import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WorkoutSegment } from '../domain/trainingPlan';
import WorkoutTimeline, { WorkoutTimelineLegend } from './WorkoutTimeline';

const segments: WorkoutSegment[] = [
  {
    phase: 'warmup',
    distanceKm: 1,
    paceSecondsPerKm: 360,
    label: 'Aquecimento: 1,00 km a 6:00 min/km',
  },
  {
    phase: 'work',
    distanceKm: 2,
    paceSecondsPerKm: 285,
    label: 'Limiar: 2,00 km a 4:45 min/km',
  },
  {
    phase: 'recovery',
    distanceKm: 1,
    paceSecondsPerKm: 360,
    label: 'Recuperação leve: 1,00 km a 6:00 min/km',
  },
  {
    phase: 'cooldown',
    distanceKm: 1,
    paceSecondsPerKm: 360,
    label: 'Desaquecimento: 1,00 km a 6:00 min/km',
  },
  {
    phase: 'race-pace',
    distanceKm: 1,
    paceSecondsPerKm: 300,
    label: 'Ritmo de prova: 1,00 km a 5:00 min/km',
  },
];

describe('WorkoutTimeline', () => {
  it('renders time-proportional blocks with speed heights and accessible segment metrics', () => {
    const { container } = render(<WorkoutTimeline segments={segments} />);

    const timeline = screen.getByRole('img');
    const accessibleLabel = timeline.getAttribute('aria-label') ?? '';
    let previousLabelIndex = -1;
    for (const { label } of segments) {
      const labelIndex = accessibleLabel.indexOf(label);
      expect(labelIndex).toBeGreaterThan(previousLabelIndex);
      previousLabelIndex = labelIndex;
    }
    expect(accessibleLabel).toMatch(/06:00.*10,0 km\/h/);
    expect(accessibleLabel).toMatch(/09:30.*12,6 km\/h/);

    const markers = Array.from(container.querySelectorAll<HTMLElement>('[data-phase]'));
    expect(markers.map((marker) => marker.dataset.phase)).toEqual([
      'warmup',
      'work',
      'recovery',
      'cooldown',
      'race-pace',
    ]);
    expect(markers.map((marker) => marker.style.flexGrow)).toEqual([
      '360',
      '570',
      '360',
      '360',
      '300',
    ]);
    const expectedHeights = [
      50,
      63.1578947368421,
      50,
      50,
      60,
    ];
    markers.forEach((marker, index) => {
      expect(Number.parseFloat(marker.style.height)).toBeCloseTo(expectedHeights[index], 4);
    });
    expect(markers.map((marker) => marker.title)).toEqual([
      'Aquecimento: 1,00 km a 6:00 min/km · 06:00 · 10,0 km/h',
      'Limiar: 2,00 km a 4:45 min/km · 09:30 · 12,6 km/h',
      'Recuperação leve: 1,00 km a 6:00 min/km · 06:00 · 10,0 km/h',
      'Desaquecimento: 1,00 km a 6:00 min/km · 06:00 · 10,0 km/h',
      'Ritmo de prova: 1,00 km a 5:00 min/km · 05:00 · 12,0 km/h',
    ]);
    expect(container.textContent).toContain('20 km/h');
    expect(container.textContent).toContain('0 km/h');
  });

  it('provides labels for every visual phase in the shared legend', () => {
    render(<WorkoutTimelineLegend />);

    const legend = screen.getByRole('list', { name: 'Legenda da estrutura do treino' });
    expect(legend.textContent).toContain('Aquecimento');
    expect(legend.textContent).toContain('Leve');
    expect(legend.textContent).toContain('Trabalho');
    expect(legend.textContent).toContain('Recuperação');
    expect(legend.textContent).toContain('Moderado');
    expect(legend.textContent).toContain('Desaquecimento');
    expect(legend.textContent).toContain('Ritmo de prova');
  });
});
