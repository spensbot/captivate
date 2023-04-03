import styled from 'styled-components'

import { getActionID, MidiAction } from '../redux'
import { useDeviceSelector } from '../../../renderer/redux/store'
import { SliderMidiOverlay } from './MidiOverlay'

interface XYProps {
  children: React.ReactNode
  actions: MidiAction[]
  style?: React.CSSProperties
}

export default function MidiOverlay_xy({ children, actions, style }: XYProps) {
  const isEditing = useDeviceSelector((state) => state.isEditing)

  const overlayStyle: React.CSSProperties = { width: '100%', height: '100%' }

  return (
    <Root style={style}>
      {children}
      {isEditing && (
        <Overlay>
          {actions.map((action) => (
            <Container key={getActionID(action)}>
              <SliderMidiOverlay action={action} style={overlayStyle} />
            </Container>
          ))}
          {/* <Container><SliderMidiOverlay action={actionX} style={overlayStyle}/></Container>
          <Container><SliderMidiOverlay action={actionY} style={overlayStyle}/></Container> */}
        </Overlay>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const Overlay = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  margin: 0.25rem 0 0.25rem 0.5rem;
  margin-right: 0;
`

const Container = styled.div`
  flex: 1 0 40%;
  margin: 0.25rem 0.5rem 0.25rem 0;
`
