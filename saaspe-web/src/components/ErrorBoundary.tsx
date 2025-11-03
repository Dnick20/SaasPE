'use client';

/**
 * Global Error Boundary Component
 *
 * Catches all React rendering errors and provides a fallback UI
 * with automatic error reporting to Sentry and backend.
 */

import React, { Component, ReactNode } from 'react';
import { reportError } from '@/lib/services/errorReporting';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Report error
    reportError(error, {
      severity: 'fatal',
      category: 'ui',
      component: 'ErrorBoundary',
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Something went wrong
                </h1>
                <p className="text-gray-600 mb-6">
                  We&apos;re sorry, but something unexpected happened. Our team has been notified and
                  we&apos;re working to fix the issue.
                </p>

                {/* Error details (development only or if showDetails is true) */}
                {(process.env.NODE_ENV === 'development' || this.props.showDetails) &&
                  this.state.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <h3 className="text-sm font-semibold text-red-800 mb-2">Error Details:</h3>
                      <p className="text-sm text-red-700 font-mono mb-2">
                        {this.state.error.message}
                      </p>
                      {this.state.error.stack && (
                        <details className="mt-2">
                          <summary className="text-sm text-red-700 cursor-pointer hover:text-red-800">
                            Stack Trace
                          </summary>
                          <pre className="text-xs text-red-600 mt-2 overflow-x-auto whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                        </details>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <details className="mt-2">
                          <summary className="text-sm text-red-700 cursor-pointer hover:text-red-800">
                            Component Stack
                          </summary>
                          <pre className="text-xs text-red-600 mt-2 overflow-x-auto whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button onClick={this.handleReset} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={this.handleReload} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </div>

                {/* Additional help text */}
                <p className="text-sm text-gray-500 mt-6">
                  If this problem persists, please contact support with the error details above.
                </p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for using ErrorBoundary in specific components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
