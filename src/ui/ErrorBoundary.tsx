import { Component, type ReactNode } from 'react'
import { resetSavedProfile } from '../model/storage'

interface Props {
  children: ReactNode
  onReset?: () => void
}

const defaultReset = () => {
  resetSavedProfile()
  location.reload()
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="mx-auto max-w-105 p-4">
        <p role="alert" className="mb-3 rounded-xl bg-red-950 p-3 text-left text-red-200">
          Something in your saved settings broke the tuner.
        </p>
        <button
          onClick={this.props.onReset ?? defaultReset}
          className="w-full rounded-xl bg-green-500 p-3 font-bold text-black"
        >
          Reset to Sierra 14
        </button>
      </main>
    )
  }
}
