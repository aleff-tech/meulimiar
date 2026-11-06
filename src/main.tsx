import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('O elemento raiz da aplicação não foi encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <main>
      <h1>Gerador de planilhas de corrida</h1>
    </main>
  </StrictMode>,
);
