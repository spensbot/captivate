import React from 'react'
import styled from 'styled-components'

interface Props {}

interface State {
  error?: any
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {}
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return {
      error,
    }
  }

  componentDidCatch(error: any, errorInfo: any) {
    // You can also log the error to an error reporting service
    console.error(error)
    console.info(errorInfo)
  }

  render() {
    if (this.state.error !== undefined) {
      // custom fallback UI
      return (
        <Root>
          <Title>An Error Occured</Title>
          <Info>
            Try running from undo history (if this doesn't work, you may need to
            try another option
          </Info>
          <Info>Restart from defaults</Info>
          <Info>
            Want to help with Captivate's development? Let us know what you were
            doing when the error occurred.
          </Info>
        </Root>
      )
    }

    return this.props.children
  }
}

const Root = styled.div`
  height: 100%;
  display: flex;
  background-color: ${(props) => props.theme.colors.bg.primary};
  align-items: center;
  justify-content: center;
`

const Title = styled.div`
  font-size: 1.4rem;
  color: #660000;
`

const Info = styled.div`
  color: #330000;
`
