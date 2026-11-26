import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '../i18n/useI18n.js';

interface ErrorFallbackProps {
  onRetry: () => void;
}

/** Accessible fallback shown in place of a view that crashed while rendering. */
function ErrorFallback({ onRetry }: ErrorFallbackProps) {
  const { t } = useI18n();
  return (
    <section className="card" role="alert" aria-live="assertive">
      <h2>{t.errorBoundary.title}</h2>
      <p className="meta-line">{t.errorBoundary.message}</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        {t.errorBoundary.reload}
      </button>
    </section>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** When this value changes (e.g. the user switches tab), a crashed view gets another try. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  hasError: boolean;
  resetKey: unknown;
}

/**
 * Catches rendering errors in its subtree so one broken view does not blank the whole app.
 * React only supports error boundaries as class components.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    return props.resetKey === state.resetKey
      ? null
      : { hasError: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[HawaHisaab] view crashed', error, info.componentStack);
  }

  private readonly handleRetry = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    return this.state.hasError ? (
      <ErrorFallback onRetry={this.handleRetry} />
    ) : (
      this.props.children
    );
  }
}
