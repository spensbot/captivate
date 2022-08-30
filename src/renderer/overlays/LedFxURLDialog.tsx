import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { Button, TextField, Link } from '@mui/material'
import { setLedFxURLDialog, setLedFxURL } from 'renderer/redux/guiSlice'

interface Props {}

export default function LedFxURLDialog({}: Props) {
  const dispatch = useDispatch()

  function onSaveLedFxURL() {
    // TODO: Take TextField into dispatch
    dispatch(setLedFxURL("http://localhost:8888/api/scenes"))
  }
  function onCancel() {
    dispatch(setLedFxURLDialog(false))
  }

  return (
    <Root>
      <Modal>
        <Title>LedFx URL</Title>
        <Sp />To download Ledfx, click on the <Link rel="noopener" href="https://my.ledfx.app/downloads/" target="_blank">Link</Link>.
        <Sp />Enter LedFx scene API URL.
        <Sp />If Ledfx on the same device, enter: http://localhost:8888/api/scenes
        <Sp />
        <TextField fullWidth sx={{ m: 1 }}
          label="LedFx Scene URL"
          defaultValue="http://localhost:8888/api/scenes"
          //value={LedFxURL}
          ></TextField>
        <Row>
          <Button variant="outlined" onClick={onSaveLedFxURL}>
            Save LedFx URL
          </Button>
          <Sp />
          <Sp />
          <Button variant="contained" onClick={onCancel}>
            Cancel
          </Button>
        </Row>
      </Modal>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0007;
`

const Modal = styled.div`
  background-color: ${(props) => props.theme.colors.bg.primary};
  padding: 3rem;
  box-shadow: 0px 2px 20px 0px #000000;
`

const Title = styled.div`
  font-size: 2rem;
`

const Row = styled.div`
  display: flex;
  /* flex-direction: column; */
  align-items: center;
`

const Sp = styled.div`
  width: 1rem;
  height: 1rem;
`

const Warning = styled.div`
  color: ${(props) => props.theme.colors.text.warning};
`
