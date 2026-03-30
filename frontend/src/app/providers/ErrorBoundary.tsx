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
            backgroundColor: '#191919',
            color: '#e0e0e0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#ffffff' }}>
            {translate('errorBoundary.title')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#999', marginBottom: '1.5rem', maxWidth: '480px' }}>
            {this.state.error?.message ?? translate('errorBoundary.description')}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#333',
              color: '#e0e0e0',
              border: '1px solid #555',
              borderRadius: '6px',
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
