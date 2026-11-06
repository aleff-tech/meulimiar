import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const indexPath = resolve(outputDirectory, 'index.html');

if (!existsSync(indexPath)) {
  throw new Error('O build não contém dist/index.html.');
}

const html = readFileSync(indexPath, 'utf8');
const assetReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => reference.includes('assets/'));

if (assetReferences.length === 0) {
  throw new Error('Nenhum arquivo de JavaScript ou CSS foi encontrado no HTML gerado.');
}

for (const reference of assetReferences) {
  if (!reference.startsWith('./') || reference.startsWith('//')) {
    throw new Error(`O caminho do asset não é relativo ao projeto: ${reference}`);
  }

  if (!existsSync(resolve(outputDirectory, reference))) {
    throw new Error(`O asset referenciado pelo build não existe: ${reference}`);
  }
}

console.log(`Build pronto para GitHub Pages: ${assetReferences.length} assets relativos verificados.`);
