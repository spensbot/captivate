import styled from 'styled-components'
import LfoMenu from './LfoMenu'
import LfoVisualizer from './LfoVisualizer'
import LfoCursor from './LfoCursor'
import ModulationMatrix from './ModulationMatrix'

type Props = {
  index: number
}

export default function ModulatorControl({ index }: Props) {
  return (
    <Root>
      <LfoMenu index={index} />
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <LfoVisualizer width={200} height={150} padding={0.05} index={index} />
        <LfoCursor index={index} padding={0.05} />
      </div>
      <ModulationMatrix index={index} />
    </Root>
  )
}

const Root = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  margin-right: 1rem;
`
