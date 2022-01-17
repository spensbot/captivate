import SplitPane from '../base/SplitPane'
import styled from 'styled-components'
import MyFixtures from '../dmx/MyFixtures'
import MyUniverse from '../dmx/MyUniverse'
import Groups from '../dmx/Groups'
import StatusBar from '../menu/StatusBar'

export default function Universe() {
  return (
    <>
      <StatusBar />
      <SplitPane
        style={{ height: '100vh', width: '100%' }}
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
    </>
  )
}

const SplitRoot = styled.div`
  height: 100%;
`
