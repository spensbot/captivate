import styled from 'styled-components'
import { store, resetState } from 'renderer/redux/store'
import { getSaveSlots, startAutoSave, stopAutoSave } from 'features/fileSaving/react/autosave'
import { Button, ButtonGroup } from '@mui/material'
import { useEffect } from 'react'
import initState from 'renderer/redux/initState'

export default function ErrorBoundaryFallback({
  resetError,
}: {
  resetError: () => void
}) {
  useEffect(() => {
    stopAutoSave()
    return () => startAutoSave()
  }, [])

  let saves = getSaveSlots()

  return (
    <Root>
      <Title>An Error Occured :/</Title>
      <Info>First, try loading a recent save</Info>
      <ButtonGroup variant="contained">
        {saves.map(({ timePassed, apply }, i) => (
          <Button
            key={i}
            onClick={() => {
              apply()
              resetError()
            }}
          >
            {timePassed}
          </Button>
        ))}
      </ButtonGroup>
      <Info>If that doesn't work, you may have to:</Info>
      <Button
        variant="contained"
        onClick={() => {
          store.dispatch(resetState(initState()))
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
