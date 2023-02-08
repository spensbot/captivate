import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { Button } from '@mui/material'
import { setSceneSelect } from 'renderer/redux/guiSlice'
import MuiDropdown from '../base/MuiDropdown'
import { setActiveLedFxName, setResults } from '../redux/controlSlice'
import { useEffect } from 'react'
import { fetchScenes } from './../autosave'
import { setSelected } from '../redux/controlSlice'

import { useControlSelector } from '../redux/store'
interface Props {}

export default function SceneSelect({}: Props) {
  const dispatch = useDispatch()

  const url = useControlSelector((control: any) => control['light'].url)
  const ledfxname = useControlSelector(
    (control: any) => control['light'].ledfxname
  )
  const result = useControlSelector((control: any) => control['light'].results)

  useEffect(() => onLoad(), [])

  function onLoad() {
    fetchScenes(url).then((response: any) => {
      try {
        dispatch(setResults(Object.entries(response.scenes)))
      } catch (err: any) {
        if (err.message.includes('scenes'))
          console.error('No LedFx URL, error getting the scenes')
        else console.error(err.message)
      }
    })
  }

  function onConfirm() {
    // setting the name
    dispatch(setActiveLedFxName({ sceneType: 'light', val: ledfxname }))
    try {
      let dataToLoad = result.filter((el: any) => el[0] === ledfxname)
      dataToLoad = JSON.stringify(Object.assign({}, dataToLoad[0]))
      localStorage.setItem(ledfxname, dataToLoad)
    } catch (err) {
      console.error(err)
    }
    onCancel()
  }
  function onCancel() {
    dispatch(setSelected('Select a scene ↓'))
    dispatch(setSceneSelect(false))
  }

  return (
    <Root>
      <Modal>
        <Title>Scene Select</Title>

        <Sp />

        <Sp />
        <Row>
          <MuiDropdown results={result} />
        </Row>
        <Sp />
        <Sp />
        <Row>
          <ButtonExtended variant="outlined" onClick={onConfirm}>
            Set selected scene
          </ButtonExtended>
        </Row>
        <Sp />
        <Sp />
        <ButtonExtended variant="contained" onClick={onCancel}>
          Cancel
        </ButtonExtended>
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
  overflow-y: visible;
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
const ButtonExtended = styled(Button)`
  width: 100%;
`
