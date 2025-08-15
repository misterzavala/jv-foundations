// Error Boundary to catch React errors
import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              ❌ Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              A React error occurred that prevented the page from loading.
            </p>
            <div className="bg-red-100 text-red-800 p-3 rounded text-sm mb-4">
              <strong>Error:</strong> {this.state.error?.message}
            </div>
            <div className="bg-red-100 text-red-800 p-3 rounded text-sm mb-4">
              <strong>Stack:</strong> 
              <pre className="text-xs mt-2 overflow-x-auto">
                {this.state.error?.stack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}