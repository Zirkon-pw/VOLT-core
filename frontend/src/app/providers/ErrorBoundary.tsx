import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '@shared/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Volt caught an unhandled error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--surface-shell-panel) 92%, var(--surface-shell-root)) 0%, var(--surface-shell-root) 100%)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
            {translate('errorBoundary.title')}
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: '480px' }}>
            {this.state.error?.message ?? translate('errorBoundary.description')}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.625rem 1.5rem',
              fontSize: '0.95rem',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 92%, white) 0%, var(--color-accent) 100%)',
              color: 'var(--color-accent-text)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 64%, var(--color-border))',
              borderRadius: '999px',
              cursor: 'pointer',
            }}
          >
            {translate('common.reload')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
