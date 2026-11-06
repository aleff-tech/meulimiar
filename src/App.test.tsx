import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

function localDateAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function fillValidForm({
  fiveKmTime = { hours: '0', minutes: '22', seconds: '30' },
  goalTime = { hours: '1', minutes: '15', seconds: '30' },
  raceDate = localDateAfter(84),
}: {
  fiveKmTime?: { hours: string; minutes: string; seconds: string };
  goalTime?: { hours: string; minutes: string; seconds: string };
  raceDate?: string;
} = {}) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Distância da prova' }), {
    target: { value: '10' },
  });
  const fiveKmTimeGroup = within(
    screen.getByRole('group', { name: 'Tempo recente de prova nos 5 km' }),
  );
  fireEvent.change(fiveKmTimeGroup.getByRole('spinbutton', { name: 'Horas' }), {
    target: { value: fiveKmTime.hours },
  });
  fireEvent.change(fiveKmTimeGroup.getByRole('spinbutton', { name: 'Minutos' }), {
    target: { value: fiveKmTime.minutes },
  });
  fireEvent.change(fiveKmTimeGroup.getByRole('spinbutton', { name: 'Segundos' }), {
    target: { value: fiveKmTime.seconds },
  });
  const goalTimeGroup = within(screen.getByRole('group', { name: 'Tempo alvo para a prova' }));
  fireEvent.change(goalTimeGroup.getByRole('spinbutton', { name: 'Horas' }), {
    target: { value: goalTime.hours },
  });
  fireEvent.change(goalTimeGroup.getByRole('spinbutton', { name: 'Minutos' }), {
    target: { value: goalTime.minutes },
  });
  fireEvent.change(goalTimeGroup.getByRole('spinbutton', { name: 'Segundos' }), {
    target: { value: goalTime.seconds },
  });
  fireEvent.change(screen.getByLabelText('Data da prova'), {
    target: { value: raceDate },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso (kg)' }), {
    target: { value: '70' },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Altura (cm)' }), {
    target: { value: '175' },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Km corridos por semana' }), {
    target: { value: '30' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Sessões por semana' }), {
    target: { value: '4' },
  });
}

describe('running plan form and preview', () => {
  it('offers the five supported target distances', () => {
    render(<App />);
    const target = screen.getByRole('combobox', { name: 'Distância da prova' });

    expect(within(target).getByRole('option', { name: '3 km' }).getAttribute('value')).toBe('3');
    expect(within(target).getByRole('option', { name: '5 km' }).getAttribute('value')).toBe('5');
    expect(within(target).getByRole('option', { name: '10 km' }).getAttribute('value')).toBe('10');
    expect(
      within(target).getByRole('option', { name: 'Meia maratona (21,1 km)' }).getAttribute('value'),
    ).toBe('21.1');
    expect(
      within(target).getByRole('option', { name: 'Maratona (42,2 km)' }).getAttribute('value'),
    ).toBe('42.2');
  });

  it('keeps the current 5 km result inputs alongside the goal time and race date', () => {
    render(<App />);

    expect(
      within(screen.getByRole('group', { name: 'Tempo recente de prova nos 5 km' })).getAllByRole(
        'spinbutton',
      ),
    ).toHaveLength(3);
    expect(
      within(screen.getByRole('group', { name: 'Tempo alvo para a prova' })).getAllByRole(
        'spinbutton',
      ),
    ).toHaveLength(3);
    expect(screen.getByLabelText('Data da prova')).toBeTruthy();
  });

  it('requires a race date and a goal time', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByRole('alert').textContent).toBeTruthy();
    expect(screen.getByLabelText('Data da prova').getAttribute('aria-invalid')).toBe('true');
    expect(
      within(screen.getByRole('group', { name: 'Tempo alvo para a prova' }))
        .getByRole('spinbutton', { name: 'Horas' })
        .getAttribute('aria-invalid'),
    ).toBe('true');
    expect(screen.queryByRole('heading', { name: 'Plano semanal' })).toBeNull();
  });

  it('does not require a four-week minimum to generate a plan', () => {
    render(<App />);
    fillValidForm({ raceDate: localDateAfter(14) });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByRole('heading', { name: 'Plano semanal' })).toBeTruthy();
    expect(screen.getByText(/menos de quatro semanas/i)).toBeTruthy();
  });

  it('does not render weeks or load-preference controls', () => {
    render(<App />);

    expect(screen.queryByLabelText('Semanas até a prova')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Preferência de carga' })).toBeNull();
    expect(screen.queryByLabelText('Mais leve')).toBeNull();
    expect(screen.queryByLabelText('Mais agressiva')).toBeNull();
  });

  it('shows BMI from valid weight and height without requiring the rest of the form', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso (kg)' }), {
      target: { value: '70' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Altura (cm)' }), {
      target: { value: '175' },
    });

    const bmiValue = screen.getByText('22,9');

    expect(bmiValue.parentElement?.textContent).toContain('IMC informativo: 22,9');
  });

  it('keeps adult confirmation optional and gates adult BMI guidance on confirmation', () => {
    render(<App />);
    fillValidForm();

    const adultConfirmation = screen.getByRole('checkbox', {
      name: 'Confirmo que tenho 18 anos ou mais',
    });
    expect((adultConfirmation as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    const getPaces = () => [
      screen.getByText(/Ritmo leve:/).textContent,
      screen.getByText(/Ritmo de limiar:/).textContent,
      screen.getByText(/Ritmo de tiro:/).textContent,
    ];
    const initialPaces = getPaces();
    const initialPlan = screen.getByRole('table', { name: 'Treinos por semana' }).textContent;

    expect(screen.queryByText(/Em adultos, IMC igual ou acima de 30/)).toBeNull();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso (kg)' }), {
      target: { value: '91.9' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.queryByText(/Em adultos, IMC igual ou acima de 30/)).toBeNull();
    expect(screen.getAllByText('30,0').length).toBeGreaterThan(0);

    fireEvent.click(adultConfirmation);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByText(/Em adultos, IMC igual ou acima de 30/)).toBeTruthy();
    expect(getPaces()).toEqual(initialPaces);
    expect(screen.getByRole('table', { name: 'Treinos por semana' }).textContent).toBe(initialPlan);
  });

  it('shows the race date and goal time with the generated plan', () => {
    render(<App />);
    const raceDate = localDateAfter(84);
    const [year, month, day] = raceDate.split('-');
    fillValidForm({ raceDate });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(
      screen.getByText(new RegExp(`Prova: ${day}/${month}/${year} · Meta: 01:15:30`)),
    ).toBeTruthy();
  });

  it('does not generate a plan when required values are missing', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByRole('alert').textContent).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Plano semanal' })).toBeNull();
  });

  it('generates the selected plan and shows paces and sessions', () => {
    render(<App />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByRole('heading', { name: 'Plano semanal' })).toBeTruthy();
    expect(screen.getByText(/Ritmo leve: 6:00 min\/km/)).toBeTruthy();
    expect(screen.getByText(/Ritmo de limiar: 4:45 min\/km/)).toBeTruthy();
    expect(screen.getByText(/Ritmo de tiro: 4:25 min\/km/)).toBeTruthy();
    expect(screen.getAllByText('Semana 1').length).toBeGreaterThan(0);
  });

  it('renders an accessible timeline for every session in the weekly preview', () => {
    render(<App />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    const table = screen.getByRole('table', { name: 'Treinos por semana' });
    expect(within(table).getByRole('columnheader', { name: 'Estrutura visual' })).toBeTruthy();

    const timelines = within(table).getAllByRole('img');
    expect(timelines.length).toBeGreaterThan(0);
    expect(
      timelines.some((timeline) =>
        /Aquecimento.*Limiar.*Desaquecimento/.test(timeline.getAttribute('aria-label') ?? ''),
      ),
    ).toBe(true);
    expect(screen.getByRole('list', { name: 'Legenda da estrutura do treino' })).toBeTruthy();
  });

  it('shows easy warm-up and cool-down phases and the quality workout after them', () => {
    render(<App />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    const table = screen.getByRole('table', { name: 'Treinos por semana' });
    const qualityRow = within(table)
      .getAllByRole('row')
      .find((row) => row.textContent?.includes('Qualidade · Limiar'));

    expect(screen.getByRole('columnheader', { name: 'Aquecimento' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Treino principal' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Desaquecimento' })).toBeTruthy();
    expect(qualityRow?.textContent).toContain('09:58');
    expect(qualityRow?.textContent).toContain('04:59');
    expect(qualityRow?.textContent).toContain('leve a 6:00 min/km');
    expect(qualityRow?.textContent).toContain('Limiar:');
  });

  it('shows a warning when a quality session is adapted to easy running', () => {
    render(<App />);
    fillValidForm();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Km corridos por semana' }), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByText(/adaptada para corrida leve/)).toBeTruthy();
  });

  it('shows session distances to the nearest 0.01 km', () => {
    render(<App />);
    fillValidForm();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Km corridos por semana' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sessões por semana' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Data da prova'), {
      target: { value: localDateAfter(28) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByText('1,05 km')).toBeTruthy();
  });

  it('warns when the 5 km time is outside the pace reference range', () => {
    render(<App />);
    fillValidForm({ fiveKmTime: { hours: '0', minutes: '19', seconds: '59' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByText(/podem não refletir seu esforço/)).toBeTruthy();
  });

  it('clears the cross-field time error when the corrected time is valid', () => {
    render(<App />);
    fillValidForm({ fiveKmTime: { hours: '2', minutes: '0', seconds: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    const timeError = 'O tempo nos 5 km deve ficar entre 00:01:00 e 02:00:00.';
    expect(screen.getByText(timeError)).toBeTruthy();

    fireEvent.change(
      within(screen.getByRole('group', { name: 'Tempo recente de prova nos 5 km' })).getByRole(
        'spinbutton',
        { name: 'Segundos' },
      ),
      {
        target: { value: '0' },
      },
    );

    expect(screen.queryByText(timeError)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears a generated plan when the inputs change', () => {
    render(<App />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));
    expect(screen.getByRole('heading', { name: 'Plano semanal' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Data da prova'), {
      target: { value: localDateAfter(77) },
    });

    expect(screen.queryByRole('heading', { name: 'Plano semanal' })).toBeNull();
  });

  it('offers the XLSX download only after generating a valid plan', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Baixar planilha XLSX' })).toBeNull();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByRole('button', { name: 'Baixar planilha XLSX' })).toBeTruthy();
  });
});
