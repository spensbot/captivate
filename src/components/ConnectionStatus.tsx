import React from 'react'
import { useTypedSelector } from '../redux/store'
import styled from 'styled-components'
import { useTheme } from '@material-ui/core/styles'
import { useDispatch } from 'react-redux'
import { toggleIsEditing } from '../redux/midiSlice'

interface Props {
  type: 'midi' | 'dmx'
}

export default function ConnectionStatus({type}: Props) {

  const connection = useTypedSelector(state => state.connections[type]);
  const dispatch = useDispatch()
  const theme = useTheme()
  
  const color = connection.isConnected ? theme.palette.success : theme.palette.error

  const onClick = type === 'dmx'
    ? () => dispatch(toggleIsEditing())
    : () => { }

  return (
    <Root>
      <Text>{type}</Text>
      <Button style={{ backgroundColor: color.main }} onClick={onClick}></Button>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  padding: 0rem 0.2rem;
  font-size: 0.8rem;
`

const Text = styled.span`
  color: #fff7
`

const Button = styled.div`
  width: 0.6rem;
  height: 0.6rem;
  cursor: pointer;
  margin-left: 0.5rem;
`