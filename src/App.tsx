import { useState } from 'react';
import { calculateBmi } from './domain/bmi';
import { calculatePaces } from './domain/paces';
import type { RunnerProfile } from './domain/profile';
import { buildTrainingPlan, type TrainingPlan } from './domain/trainingPlan';
import TrainingForm from './components/TrainingForm';
import TrainingPreview from './components/TrainingPreview';

interface GeneratedPlan {
  profile: RunnerProfile;
  bmi: number;
  paces: ReturnType<typeof calculatePaces>;
  plan: TrainingPlan;
}

export default function App() {
  const [generated, setGenerated] = useState<GeneratedPlan | null>(null);

  function handleGenerate(profile: RunnerProfile) {
    const paces = calculatePaces(profile.fiveKmTimeSeconds);
    const bmi = calculateBmi(profile.weightKg, profile.heightCm);
    const plan = buildTrainingPlan(profile, paces);

    setGenerated({ profile, bmi, paces, plan });
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">MEULIMIAR · CORRIDA DE RUA</p>
        <h1>Gerador de planilhas de corrida</h1>
        <p>Transforme sua marca de 5 km em um ciclo de treinos para a próxima prova.</p>
      </header>

      <main className="content">
        <TrainingForm onGenerate={handleGenerate} onInputChange={() => setGenerated(null)} />
        {generated && (
          <TrainingPreview
            profile={generated.profile}
            paces={generated.paces}
            bmi={generated.bmi}
            plan={generated.plan}
          />
        )}
      </main>

      <footer className="page-footer">
        <p>
          Ferramenta de orientação geral, não uma prescrição individual. Os dados ficam somente
          neste navegador.
        </p>
      </footer>
    </div>
  );
}
