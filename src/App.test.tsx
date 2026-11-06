import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

function fillValidForm(time = { hours: '0', minutes: '22', seconds: '30' }) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Distância da prova' }), {
    target: { value: '10' },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Horas' }), {
    target: { value: time.hours },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Minutos' }), {
    target: { value: time.minutes },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Segundos' }), {
    target: { value: time.seconds },
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
  fireEvent.change(screen.getByRole('combobox', { name: 'Semanas até a prova' }), {
    target: { value: '12' },
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

  it('shows session distances to the nearest 0.01 km', () => {
    render(<App />);
    fillValidForm();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Km corridos por semana' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sessões por semana' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Semanas até a prova' }), {
      target: { value: '4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByText('1,05 km')).toBeTruthy();
  });

  it('warns when the 5 km time is outside the pace reference range', () => {
    render(<App />);
    fillValidForm({ hours: '0', minutes: '19', seconds: '59' });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));

    expect(screen.getByText(/ritmos foram limitados à faixa de referência/)).toBeTruthy();
  });

  it('clears a generated plan when the inputs change', () => {
    render(<App />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar plano' }));
    expect(screen.getByRole('heading', { name: 'Plano semanal' })).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox', { name: 'Semanas até a prova' }), {
      target: { value: '11' },
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
