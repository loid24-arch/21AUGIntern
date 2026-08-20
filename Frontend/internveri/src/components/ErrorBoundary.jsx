import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Something went wrong' }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="landing" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem' }}>
          <div className="empty-card" style={{ maxWidth: 420 }}>
            <span className="empty-card-icon">⚠</span>
            <h4>Something went wrong</h4>
            <p>An unexpected error occurred while rendering this page: {this.state.message}</p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                this.handleReset()
                window.location.reload()
              }}
            >
              Reload the app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
