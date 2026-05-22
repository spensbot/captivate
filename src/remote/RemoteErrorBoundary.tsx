import { Component, type ErrorInfo, type ReactNode } from 'react'
import styled from 'styled-components'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class RemoteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Captivate Remote UI error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <FatalRoot>
          <FatalTitle>Captivate Remote failed to load</FatalTitle>
          <FatalMessage>{this.state.error.message}</FatalMessage>
          <FatalHint>Check the browser console, then reload this page.</FatalHint>
        </FatalRoot>
      )
    }
    return this.props.children
  }
}

const FatalRoot = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  box-sizing: border-box;
  background: #12151c;
  color: #e8ecf4;
  text-align: center;
`

const FatalTitle = styled.h1`
  margin: 0;
  font-size: 1.1rem;
`

const FatalMessage = styled.pre`
  margin: 0;
  max-width: 36rem;
  white-space: pre-wrap;
  font-size: 0.78rem;
  color: #ffb4b4;
`

const FatalHint = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: #9aa3b5;
`
