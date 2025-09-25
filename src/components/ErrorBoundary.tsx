import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log l'erreur si besoin
    console.error('Erreur capturée par ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-100 text-red-800 rounded shadow text-center">
          <h2 className="text-xl font-bold mb-2">Une erreur est survenue dans le formulaire</h2>
          <pre className="text-xs whitespace-pre-wrap text-left max-w-xl mx-auto overflow-x-auto">{String(this.state.error)}</pre>
          <div className="mt-4 text-gray-500">Essayez de recharger la page ou de corriger la configuration du champ.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
