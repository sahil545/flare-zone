import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="w-full border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Component Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-red-700">
                A component error occurred. This is likely due to a JavaScript runtime error.
              </p>
              
              {this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-600 hover:text-red-800 mb-2">
                    View Error Details
                  </summary>
                  <pre className="bg-red-100 p-2 rounded overflow-x-auto text-xs text-red-800">
                    {this.state.error.name}: {this.state.error.message}
                    {this.state.error.stack && `\n\nStack trace:\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
              
              <button 
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
