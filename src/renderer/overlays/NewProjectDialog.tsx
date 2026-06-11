import { useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import initState from '../redux/initState'
import defaultState from '../redux/defaultState'
import { resetState } from '../redux/store'
import { Button, TextField } from '@mui/material'
import { setNewProjectDialog } from 'renderer/redux/guiSlice'
import { projectFileFilters } from '../../shared/projectFiles'
import { saveFile } from '../project/fileIO'
import { createNewProjectAtPath } from '../menu/projectSaveLoadActions'
import { openAppAlert } from './appDialogService'

type Step = 'choose-template' | 'choose-location'

export default function NewProjectDialog() {
  const dispatch = useDispatch()
  const [step, setStep] = useState<Step>('choose-template')
  const [useDefaultScenes, setUseDefaultScenes] = useState<boolean | null>(null)
  const [projectName, setProjectName] = useState('Untitled')

  function onCancel() {
    dispatch(setNewProjectDialog(false))
  }

  function onChooseTemplate(useDefault: boolean) {
    setUseDefaultScenes(useDefault)
    setStep('choose-location')
  }

  async function onChooseSaveLocation() {
    if (useDefaultScenes === null) {
      return
    }
    const trimmedName = projectName.trim()
    if (trimmedName.length === 0) {
      void openAppAlert({
        title: 'Project Name Required',
        message: 'Enter a project name before choosing a save location.',
        level: 'warn',
        source: 'NewProject',
      })
      return
    }

    const savedPath = await saveFile(
      'Choose Project Save Location',
      '{}',
      [projectFileFilters],
      { defaultPath: `${trimmedName}.cap` }
    )
    if (savedPath === null) {
      void openAppAlert({
        title: 'Save Location Required',
        message:
          'A project save location is required to create a new project. Choose a folder and file name, or cancel.',
        level: 'warn',
        source: 'NewProject',
      })
      return
    }

    try {
      const templateState = useDefaultScenes ? defaultState() : initState()
      dispatch(resetState(templateState))
      await createNewProjectAtPath(savedPath)
      dispatch(setNewProjectDialog(false))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error.'
      void openAppAlert({
        title: 'New Project Failed',
        message: `Could not create project files: ${message}`,
        level: 'error',
        source: 'NewProject',
      })
    }
  }

  return (
    <Root>
      <Modal>
        {step === 'choose-template' ? (
          <>
            <Title>New Project</Title>
            <Sp />
            <Warning>
              You must choose a save folder and file name before continuing. Unsaved
              changes in the current project will be lost.
            </Warning>
            <Sp />
            <Row>
              <Button variant="outlined" onClick={() => onChooseTemplate(false)}>
                Empty Project
              </Button>
              <Sp />
              <Button variant="outlined" onClick={() => onChooseTemplate(true)}>
                Default Scenes
              </Button>
              <Sp />
              <Button variant="contained" onClick={onCancel}>
                Cancel
              </Button>
            </Row>
          </>
        ) : (
          <>
            <Title>Project Save Location</Title>
            <Sp />
            <Help>
              Pick the folder and file name for this project. Captivate will create a
              matching fixture database file (`.cfx`) in the same folder. Autosave and
              manual save use this project file.
            </Help>
            <Sp />
            <TextField
              label="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              size="small"
              fullWidth
            />
            <Sp />
            <Row>
              <Button variant="outlined" onClick={() => setStep('choose-template')}>
                Back
              </Button>
              <Sp />
              <Button variant="contained" onClick={() => void onChooseSaveLocation()}>
                Choose Folder &amp; Save…
              </Button>
            </Row>
          </>
        )}
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
  min-width: 28rem;
  max-width: 36rem;
`

const Title = styled.div`
  font-size: 2rem;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
`

const Sp = styled.div`
  width: 1rem;
  height: 1rem;
`

const Warning = styled.div`
  color: ${(props) => props.theme.colors.text.warning};
`

const Help = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  line-height: 1.45;
`
