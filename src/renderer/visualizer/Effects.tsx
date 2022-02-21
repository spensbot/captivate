import styled from 'styled-components'
import ActiveEffect from './ActiveEffect'
import EffectList from './EffectList'

interface Props {}

export default function Effects({}: Props) {
  return (
    <Root>
      <Header>Effects</Header>
      <Col>
        <EffectList />
        <ActiveEffect />
      </Col>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const Header = styled.div`
  padding: 0.3rem 0.5rem;
  font-size: 1.2rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  color: ${(props) => props.theme.colors.text.secondary};
`

const Col = styled.div`
  display: flex;
  flex: 1 0 0;
`
