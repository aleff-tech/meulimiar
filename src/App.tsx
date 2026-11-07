import { useState } from 'react';
import { calculateBmi } from './domain/bmi';
import { calculatePaces } from './domain/paces';
import type { RunnerProfile } from './domain/profile';
import { buildTrainingPlan, type TrainingPlan } from './domain/trainingPlan';
import { createTrainingWorkbook, downloadTrainingWorkbook } from './export/workbook';
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
    const plan = buildTrainingPlan(profile, paces, new Date());

    setGenerated({ profile, bmi, paces, plan });
  }

  function handleDownload() {
    if (!generated) {
      throw new Error('Gere um plano antes de baixar a planilha.');
    }

    const workbook = createTrainingWorkbook(
      generated.profile,
      generated.paces,
      generated.bmi,
      generated.plan,
    );
    downloadTrainingWorkbook(workbook);
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
          <>
            <TrainingPreview
              profile={generated.profile}
              paces={generated.paces}
              bmi={generated.bmi}
              plan={generated.plan}
            />
            <div className="download-row">
              <button className="download-button" type="button" onClick={handleDownload}>
                Baixar planilha XLSX
              </button>
            </div>
          </>
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
