import React from 'react'
import Counter2 from './Counter2'
import ConnectionStatus from './ConnectionStatus'
import { useRealtimeSelector } from '../redux/realtimeStore'
import useDragBasic from './hooks/useDragBasic'
import { incrementTempo, setLinkEnabled } from '../engine/engine'
import styled from 'styled-components'
import MidiOverlay from './base/MidiOverlay'

function BPM() {
  const bpm = useRealtimeSelector(state => state.time.bpm)

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX / 3
    const dy = - e.movementY / 3
    incrementTempo(dx + dy)
  })

  return (
    <MidiOverlay action={{type: 'setBpm'}}>
      <div ref={dragContainer} onMouseDown={onMouseDown} style={{ margin: '0 1rem 0 0', cursor: 'nesw-resize', userSelect: 'none' }}>
        {`${Math.round(bpm)} BPM`}
      </div>
    </MidiOverlay>
  )
}

function LinkButton() {
  const numPeers = useRealtimeSelector(state => state.time.numPeers)
  const isEnabled = useRealtimeSelector(state => state.time.isEnabled)

  const style: React.CSSProperties = {
    backgroundColor: isEnabled ? '#3d5a' : '#fff3',
    color: isEnabled ? '#eee' : '#fff9',
    borderRadius: '0.3rem',
    padding: '0.2rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginRight: '0.5rem'
  }

  return (
    <div onClick={() => setLinkEnabled(!isEnabled)} style={style}>
      Link{isEnabled ? `: ${numPeers}` : ""}
    </div>
  )
}

export default function StatusBar() {
  return (
    <Root>
      <LinkButton />
      <BPM />
      <Counter2 />
      <div style={{ flex: '1 0 0' }} />
      <Connections>
        <ConnectionStatus type={'midi'} />
        <ConnectionStatus type={'dmx'} />
      </Connections>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  justify-content: right;
  align-items: center;
  font-size: 1.2rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #fff3;
`

const Connections = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`