import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

describe('application bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts the app into the root element', async () => {
    await act(async () => {
      await import('../main');
    });

    expect(
      screen.getByRole('heading', { name: 'Gerador de planilhas de corrida' }).textContent,
    ).toBe('Gerador de planilhas de corrida');
  });
});
