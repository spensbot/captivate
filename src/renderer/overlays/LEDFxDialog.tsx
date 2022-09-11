import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { Button } from '@mui/material'
import { setLEDFx } from 'renderer/redux/guiSlice'
import Input from './../base/Input'
import { setURL } from 'renderer/redux/controlSlice'
import { useControlSelector } from '../redux/store'
interface Props {}

export default function LEDFxDialog({}: Props) {
  const url = useControlSelector((control: any) => control['light'].url)

  const dispatch = useDispatch()

  function onAdd() {
    dispatch(setURL(url))
    if (url.length < 1) return
    onCancel()
  }
  function onCancel() {
    dispatch(setLEDFx(false))
  }
  function onChange(e: string) {
    dispatch(setURL(e))
  }

  return (
    <Root>
      <Modal>
        <Title>LEDFx Dialog</Title>
        <Sp />
        <Paragraph>
          If you want to download the LedFx click this{' '}
          <Link href="https://www.ledfx.app/download-ledfx/">link</Link>.
        </Paragraph>
        <Paragraph>Enter LedFx scene API URL.</Paragraph>
        <Paragraph>
          If LedFx is active on the same device, enter
          "http://localhost:8888/api/scenes".
        </Paragraph>
        <Sp />
        <Row>
          <Input
            onChange={(e) => onChange(e)}
            value={url}
            placeholder="Enter LedFx endpoint URL"
          />
        </Row>
        <Sp />
        <Row>
          <Button variant="outlined" onClick={onAdd}>
            Set LEDFx URL
          </Button>

          <Sp />
          <Button variant="contained" onClick={onCancel}>
            Cancel
          </Button>
        </Row>
        <Row></Row>
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
  width: 40%;
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
const Paragraph = styled.p`
  font-size: 0.9rem;
`
const Link = styled.a`
  font-size: 1rem;
  color: white;
`
