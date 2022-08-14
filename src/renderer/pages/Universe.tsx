import SplitPane from '../base/SplitPane'
import styled from 'styled-components'
import MyFixtures from '../dmx/MyFixtures'
import MyUniverse from '../dmx/MyUniverse'
import StatusBar from '../menu/StatusBar'

export default function Universe() {
  return (
    <Root>
      <StatusBar />
      <SplitPane
        style={{ flex: '1 0 0', overflow: 'auto' }}
        type="vertical"
        initialSplit={0.3}
        rem={0.5}
        min={0.2}
        max={0.6}
      >
        <SplitRoot>
          <MyFixtures />
          {/* <SplitPane
            style={{ height: '100%', width: '100%' }}
            type="horizontal"
            initialSplit={0.5}
            rem={0.5}
            min={0.25}
            max={0.75}
          >
            <MyFixtures />
            <Groups />
          </SplitPane> */}
        </SplitRoot>
        <SplitRoot>
          <MyUniverse />
        </SplitRoot>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`

const SplitRoot = styled.div`
  height: 100%;
  overflow: auto;
`
