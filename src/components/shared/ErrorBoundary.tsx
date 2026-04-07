import { Component, type ReactNode } from 'react'
import { Warning2 } from 'iconsax-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full flex-col items-center justify-center"
          style={{ padding: '40px', gap: '16px' }}
        >
          <Warning2 size={40} color="var(--status-error)" variant="Broken" />
          <div className="text-center" style={{ maxWidth: '400px' }}>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              {this.props.fallbackTitle ?? 'Something went wrong'}
            </h2>
            <p
              style={{
                fontSize: '12px',
                lineHeight: '18px',
                color: 'var(--text-muted)',
              }}
            >
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="btn-press flex items-center justify-center"
            style={{
              height: '32px',
              padding: '0 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
