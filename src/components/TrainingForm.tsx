import { useState, type FormEvent } from 'react';
import { calculateBmi } from '../domain/bmi';
import {
  parseRunnerProfile,
  type ProfileErrors,
  type RunnerFormValues,
  type RunnerProfile,
} from '../domain/profile';

interface TrainingFormProps {
  onGenerate(profile: RunnerProfile): void;
  onInputChange(): void;
}

const timeFields = [
  { field: 'fiveKmHours', label: 'Horas', max: 23 },
  { field: 'fiveKmMinutes', label: 'Minutos', max: 59 },
  { field: 'fiveKmSeconds', label: 'Segundos', max: 59 },
] as const;

const initialValues: RunnerFormValues = {
  targetDistanceKm: '',
  fiveKmHours: '',
  fiveKmMinutes: '',
  fiveKmSeconds: '',
  weightKg: '',
  heightCm: '',
  currentWeeklyKm: '',
  sessionsPerWeek: '',
  weeksAvailable: '',
  preference: 'light',
};

function readMeasurement(value: string): number | undefined {
  if (!value.trim()) return undefined;

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function FieldError({ error, id }: { error: string | undefined; id: string }) {
  return error ? (
    <span className="field-error" id={id}>
      {error}
    </span>
  ) : null;
}

export default function TrainingForm({ onGenerate, onInputChange }: TrainingFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const weight = readMeasurement(values.weightKg);
  const height = readMeasurement(values.heightCm);
  const bmi =
    weight !== undefined &&
    height !== undefined &&
    weight >= 20 &&
    weight <= 250 &&
    height >= 100 &&
    height <= 250
      ? calculateBmi(weight, height)
      : undefined;
  const formattedBmi =
    bmi === undefined
      ? undefined
      : new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(bmi);

  function updateField(field: keyof RunnerFormValues, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    onInputChange();
    setErrors((current) => {
      const next = { ...current };
      const isTimeField = timeFields.some((timeField) => timeField.field === field);
      if (!isTimeField || !hasSubmitted) {
        delete next[field];
        return next;
      }

      for (const timeField of timeFields) {
        delete next[timeField.field];
      }

      const result = parseRunnerProfile(nextValues);
      if (!result.ok) {
        for (const timeField of timeFields) {
          const error = result.errors[timeField.field];
          if (error) next[timeField.field] = error;
        }
      }

      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    const result = parseRunnerProfile(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    onGenerate(result.value);
  }

  return (
    <section className="form-card" aria-labelledby="form-title">
      <div className="section-heading">
        <p className="eyebrow">PERSONALIZE SEU CICLO</p>
        <h2 id="form-title">Seus dados de corrida</h2>
        <p>Use uma marca recente de 5 km e sua rotina atual para montar o plano.</p>
      </div>

      <form noValidate onSubmit={handleSubmit}>
        {hasSubmitted && Object.keys(errors).length > 0 && (
          <div className="form-summary" role="alert">
            Revise os campos destacados antes de gerar o plano.
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="targetDistanceKm">Distância da prova</label>
            <select
              id="targetDistanceKm"
              name="targetDistanceKm"
              value={values.targetDistanceKm}
              onChange={(event) => updateField('targetDistanceKm', event.target.value)}
              aria-invalid={Boolean(errors.targetDistanceKm)}
              aria-describedby={errors.targetDistanceKm ? 'targetDistanceKm-error' : undefined}
            >
              <option value="">Selecione a distância</option>
              <option value="3">3 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="21.1">Meia maratona (21,1 km)</option>
              <option value="42.2">Maratona (42,2 km)</option>
            </select>
            <FieldError error={errors.targetDistanceKm} id="targetDistanceKm-error" />
          </div>

          <fieldset className="field time-field">
            <legend>Tempo recente de prova nos 5 km</legend>
            <div className="time-inputs">
              {timeFields.map(({ field, label, max }) => {
                const key = field;
                const errorId = `${field}-error`;

                return (
                  <div className="field" key={field}>
                    <label htmlFor={field}>{label}</label>
                    <input
                      id={field}
                      name={field}
                      type="number"
                      min="0"
                      max={max}
                      step="1"
                      inputMode="numeric"
                      value={values[key]}
                      onChange={(event) => updateField(key, event.target.value)}
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={errors[key] ? errorId : undefined}
                    />
                    <FieldError error={errors[key]} id={errorId} />
                  </div>
                );
              })}
            </div>
            <p className="field-hint">Informe o tempo total da sua prova, não o ritmo por quilômetro.</p>
          </fieldset>

          <div className="field">
            <label htmlFor="weightKg">Peso (kg)</label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              min="20"
              max="250"
              step="0.1"
              value={values.weightKg}
              onChange={(event) => updateField('weightKg', event.target.value)}
              aria-invalid={Boolean(errors.weightKg)}
              aria-describedby={errors.weightKg ? 'weightKg-error' : undefined}
            />
            <FieldError error={errors.weightKg} id="weightKg-error" />
          </div>

          <div className="field">
            <label htmlFor="heightCm">Altura (cm)</label>
            <input
              id="heightCm"
              name="heightCm"
              type="number"
              min="100"
              max="250"
              step="0.1"
              value={values.heightCm}
              onChange={(event) => updateField('heightCm', event.target.value)}
              aria-invalid={Boolean(errors.heightCm)}
              aria-describedby={errors.heightCm ? 'heightCm-error' : undefined}
            />
            <FieldError error={errors.heightCm} id="heightCm-error" />
          </div>

          {formattedBmi && (
            <p className="bmi-note" aria-live="polite">
              IMC informativo: <strong>{formattedBmi}</strong>
              <span> Esse dado não define seus ritmos nem a carga de treino.</span>
            </p>
          )}

          <div className="field">
            <label htmlFor="currentWeeklyKm">Km corridos por semana</label>
            <input
              id="currentWeeklyKm"
              name="currentWeeklyKm"
              type="number"
              min="1"
              max="250"
              step="0.1"
              value={values.currentWeeklyKm}
              onChange={(event) => updateField('currentWeeklyKm', event.target.value)}
              aria-invalid={Boolean(errors.currentWeeklyKm)}
              aria-describedby={errors.currentWeeklyKm ? 'currentWeeklyKm-error' : undefined}
            />
            <FieldError error={errors.currentWeeklyKm} id="currentWeeklyKm-error" />
          </div>

          <div className="field">
            <label htmlFor="sessionsPerWeek">Sessões por semana</label>
            <select
              id="sessionsPerWeek"
              name="sessionsPerWeek"
              value={values.sessionsPerWeek}
              onChange={(event) => updateField('sessionsPerWeek', event.target.value)}
              aria-invalid={Boolean(errors.sessionsPerWeek)}
              aria-describedby={errors.sessionsPerWeek ? 'sessionsPerWeek-error' : undefined}
            >
              <option value="">Selecione</option>
              {Array.from({ length: 7 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? 'vez' : 'vezes'}
                </option>
              ))}
            </select>
            <FieldError error={errors.sessionsPerWeek} id="sessionsPerWeek-error" />
          </div>

          <div className="field">
            <label htmlFor="weeksAvailable">Semanas até a prova</label>
            <select
              id="weeksAvailable"
              name="weeksAvailable"
              value={values.weeksAvailable}
              onChange={(event) => updateField('weeksAvailable', event.target.value)}
              aria-invalid={Boolean(errors.weeksAvailable)}
              aria-describedby={errors.weeksAvailable ? 'weeksAvailable-error' : undefined}
            >
              <option value="">Selecione</option>
              {Array.from({ length: 21 }, (_, index) => index + 4).map((count) => (
                <option key={count} value={count}>
                  {count} semanas
                </option>
              ))}
            </select>
            <FieldError error={errors.weeksAvailable} id="weeksAvailable-error" />
          </div>
        </div>

        <fieldset className="field preference-field">
          <legend>Preferência de carga</legend>
          <div className="preference-options">
            <label>
              <input
                type="radio"
                name="preference"
                value="light"
                checked={values.preference === 'light'}
                onChange={(event) => updateField('preference', event.target.value)}
              />
              Mais leve
            </label>
            <label>
              <input
                type="radio"
                name="preference"
                value="aggressive"
                checked={values.preference === 'aggressive'}
                onChange={(event) => updateField('preference', event.target.value)}
              />
              Mais agressiva
            </label>
          </div>
          <FieldError error={errors.preference} id="preference-error" />
        </fieldset>

        <button className="primary-button" type="submit">
          Gerar plano
        </button>
      </form>
    </section>
  );
}
