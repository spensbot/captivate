import styled from 'styled-components'
import { Button } from '@mui/material'
import { store, resetState } from 'renderer/redux/store'
import { refreshLastSession } from 'renderer/autosave'
import * as Sentry from '@sentry/react'
import { initDmxState } from 'renderer/redux/dmxSlice'
import { initGuiState } from 'renderer/redux/guiSlice'
import { initControlState } from 'renderer/redux/controlSlice'
import { initMixerState } from 'renderer/redux/mixerSlice'

function restore() {
  refreshLastSession(store)
}

export default function ErrorBoundaryFallback({
  resetError,
}: {
  resetError: () => void
}) {
  return (
    <Root>
      <Title>An Error Occured :/</Title>
      <Info>First, try this:</Info>
      <Button
        variant="contained"
        onClick={() => {
          restore()
          resetError()
        }}
      >
        Restore Last Auto-Save
      </Button>
      <Info>If that doesn't work, you may have to:</Info>
      <Button
        variant="contained"
        onClick={() => {
          store.dispatch(
            resetState({
              dmx: initDmxState(),
              gui: initGuiState(),
              control: initControlState(),
              mixer: initMixerState(),
            })
          )
          resetError()
        }}
      >
        Restart from defaults
      </Button>
    </Root>
  )
}

const Root = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.bg.primary};
  align-items: center;
  justify-content: center;
`

const Title = styled.div`
  font-size: 1.6rem;
  color: ${(props) => props.theme.colors.text.error};
`

const Info = styled.div`
  margin-top: 2rem;
  font-size: 1rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.5rem;
`
