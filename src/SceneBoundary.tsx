import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback: ReactNode; onError?: (message: string) => void }
type State = { error: Error | null }

export class SceneBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, _info: ErrorInfo) { this.props.onError?.(error.message) }
  render() { return this.state.error ? this.props.fallback : this.props.children }
}
