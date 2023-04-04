import styled from 'styled-components'
import StatusBar from '../menu/StatusBar'
import SplitPane from '../base/SplitPane'
import LedFixtureList from 'features/led/react/LedFixtureList'
import LedFixturePlacement from 'features/led/react/LedFixturePlacement'

export default function LedPage() {
  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    overflow: 'auto',
  }

  return (
    <Root>
      <StatusBar />
      <SplitPane
        style={splitPaneStyle}
        type="vertical"
        initialSplit={0.3}
        rem={0.5}
        min={0.2}
        max={0.5}
      >
        <Pane with_border>
          <LedFixtureList />
        </Pane>
        <Pane>
          <LedFixturePlacement />
        </Pane>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const Pane = styled.div<{ with_border?: boolean }>`
  border-right: ${(props) =>
    props.with_border && `1px solid ${props.theme.colors.divider}`};
  height: 100%;
`
