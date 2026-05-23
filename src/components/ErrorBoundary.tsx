import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: null
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, errorId: Math.random().toString(36).substring(7) }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    // Here you would log to Sentry:
    // Sentry.captureException(error, { extra: errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-8 text-center bg-[#111111] border-[#1F1F1F]">
            <AlertOctagon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-text-muted mb-6 text-sm">
              We've been notified and are looking into it. 
              {this.state.errorId && <span className="block mt-2 font-mono text-xs opacity-50">Error ID: {this.state.errorId}</span>}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
