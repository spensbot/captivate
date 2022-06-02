import styled from 'styled-components'

export default function Share() {
  return (
    <Root>
      <h1>Share</h1>
      <p>Share scenes and fixtures with other Captivate users</p>
      <h4>Coming Soon!</h4>
    </Root>
  )
}

const Root = styled.div`
  margin: 3rem;
  & > * {
    margin-bottom: 1rem;
  }
`
