import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary.js';
import { I18nProvider } from '../src/i18n/useI18n.js';

function Boom(): never {
  throw new Error('view exploded');
}

function renderWithI18n(ui: React.ReactNode) {
  return render(
    <I18nProvider language="en" setLanguage={() => undefined}>
      {ui}
    </I18nProvider>,
  );
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    renderWithI18n(
      <ErrorBoundary>
        <p>healthy view</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy view')).toBeInTheDocument();
  });

  it('shows an accessible fallback instead of a blank page when a view crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderWithI18n(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });

  it('gives the view another try when the reset key changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = renderWithI18n(
      <ErrorBoundary resetKey="swaps">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <I18nProvider language="en" setLanguage={() => undefined}>
        <ErrorBoundary resetKey="today">
          <p>today view</p>
        </ErrorBoundary>
      </I18nProvider>,
    );
    expect(screen.getByText('today view')).toBeInTheDocument();
  });
});
