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
];

describe('WorkoutTimeline', () => {
  it('renders labeled phase markers in order with distance-proportional flex growth', () => {
    const { container } = render(<WorkoutTimeline segments={segments} />);

    expect(
      screen.getByRole('img', { name: segments.map(({ label }) => label).join('. ') }),
    ).toBeTruthy();

    const markers = Array.from(container.querySelectorAll<HTMLElement>('[data-phase]'));
    expect(markers.map((marker) => marker.dataset.phase)).toEqual([
      'warmup',
      'work',
      'recovery',
      'cooldown',
    ]);
    expect(markers.map((marker) => marker.style.flexGrow)).toEqual(['1', '2', '1', '1']);
    expect(markers.map((marker) => marker.title)).toEqual(segments.map(({ label }) => label));
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
  });
});
