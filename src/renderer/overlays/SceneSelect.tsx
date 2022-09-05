import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { Button } from '@mui/material'
import { setSceneSelect } from 'renderer/redux/guiSlice'
import Dropdown from './../base/Dropdown'
import { useEffect } from 'react'
import { setActiveSceneName, setResults } from '../redux/controlSlice'
import { fetchScenes, saveConfig } from './../autosave'
import { setSelected } from '../redux/controlSlice'

import { useControlSelector } from '../redux/store'
interface Props {}

export default function SceneSelect({}: Props) {
  const dispatch = useDispatch()

  const url = useControlSelector((control: any) => control['light'].url)
  const name = useControlSelector((control: any) => control['light'].name)
  const result = useControlSelector((control: any) => control['light'].results)

  useEffect(() => onLoad(), [])

  function onLoad() {
    fetchScenes(url).then((response: any) => {
      dispatch(setResults(Object.entries(response.scenes)))
    })
  }

  function onConfirm() {
    // setting the name
    dispatch(
      setActiveSceneName({
        sceneType: 'light',
        val: name,
      })
    )
    let dataToLoad = result.filter((el: any) => el[1].name === name)
    dataToLoad = JSON.stringify(Object.assign({}, dataToLoad[0]))
    saveConfig(name, dataToLoad)
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
          <Dropdown results={result} />
        </Row>
        <Sp />
        <Row>
          <ButtonExtended variant="outlined" onClick={onConfirm}>
            Set selected scene
          </ButtonExtended>
        </Row>
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
