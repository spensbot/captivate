import React from 'react'
import styled from 'styled-components'
import { MidiAction } from '../../redux/midiSlice'
import { useTypedSelector } from '../../redux/store'
import {SliderMidiOverlay} from './MidiOverlay'

interface XYProps {
  children: React.ReactNode
  actionX: MidiAction
  actionY: MidiAction
  style?: React.CSSProperties
}

export default function MidiOverlay_xy({ children, actionX, actionY, style }: XYProps) {
  const isEditing = useTypedSelector(state => state.midi.isEditing)

  const overlayStyle: React.CSSProperties = { width: '100%', height: '100%' }

  return (
    <Root style={style}>
      {children}
      {isEditing &&
        <Overlay>
        <Container><SliderMidiOverlay action={actionX} style={overlayStyle}/></Container>
        <Container><SliderMidiOverlay action={actionY} style={overlayStyle}/></Container>
        </Overlay>
      }
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
  margin: 0.5rem;
  margin-right: 0;
`

const Container = styled.div`
  flex: 1 0 0;
  height: 100%;
  margin-right: 0.5rem;
`