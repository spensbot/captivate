import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import initState from '../../../../renderer/redux/initState'
import defaultState from '../../../../renderer/redux/defaultState'
import { resetState } from '../../../../renderer/redux/store'
import { Button } from '@mui/material'
import { setNewProjectDialog } from 'features/ui/redux/guiSlice'

interface Props {}

export default function NewProjectDialog({}: Props) {
  const dispatch = useDispatch()

  function onEmpty() {
    dispatch(resetState(initState()))
  }
  function onDefault() {
    dispatch(resetState(defaultState()))
  }
  function onCancel() {
    dispatch(setNewProjectDialog(false))
  }

  return (
    <Root>
      <Modal>
        <Title>New Project</Title>
        <Sp />
        <Warning>
          WARNING: Creating a new project will erase any unsaved changes in your
          current project
        </Warning>
        <Sp />
        <Row>
          <Button variant="outlined" onClick={onEmpty}>
            New Empty Project
          </Button>
          <Sp />
          <Button variant="outlined" onClick={onDefault}>
            New Project With Default Scenes
          </Button>
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
