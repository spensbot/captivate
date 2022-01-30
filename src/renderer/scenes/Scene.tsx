import styled from 'styled-components'
import { useControlSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import {
  setActiveScene,
  newScene,
  removeScene,
  setActiveSceneBombacity,
  setActiveSceneName,
  copyActiveScene,
  SceneType,
} from '../redux/controlSlice'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import Slider from '../base/Slider'
import { ButtonMidiOverlay } from '../base/MidiOverlay'
import Input from '../base/Input'
import { Draggable } from 'react-beautiful-dnd'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import CopyIcon from '@mui/icons-material/FileCopy'

function getColor(bombacity: number) {
  const hueStart = 250
  const hueRange = 110 // 170
  const hue = (hueStart + bombacity * hueRange) % 360
  return `hsl(${hue}, ${40}%, ${50}%)`
}

interface Props {
  sceneType: SceneType
  index: number
  id: string
}

export function Scene({ sceneType, index, id }: Props) {
  const isActive = useControlSelector(
    (control) => control[sceneType].active === id
  )
  const dispatch = useDispatch()
  const bombacity = useControlSelector(
    (control) => control[sceneType].byId[id].bombacity
  )
  const name = useControlSelector((control) => control[sceneType].byId[id].name)

  const onNameChange = (newVal: string) => {
    dispatch(
      setActiveSceneName({
        sceneType: sceneType,
        val: newVal,
      })
    )
  }

  const onBombacityChange = (newVal: number) => {
    dispatch(
      setActiveSceneBombacity({
        sceneType: sceneType,
        val: newVal,
      })
    )
  }

  const onRemoveScene = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation()
    dispatch(
      removeScene({
        sceneType: sceneType,
        val: { index: index },
      })
    )
  }

  let style: React.CSSProperties = {
    backgroundColor: getColor(bombacity),
  }

  if (isActive) {
    style.border = '2px solid'
    style.color = '#fffc'
  }

  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <ButtonMidiOverlay
            action={{
              type: 'setActiveSceneIndex',
              sceneType: sceneType,
              index: index,
            }}
          >
            <Root
              style={style}
              onClick={() => {
                dispatch(
                  setActiveScene({
                    sceneType: sceneType,
                    val: id,
                  })
                )
              }}
            >
              <Number>{index + 1}</Number>
              {isActive ? (
                <Column>
                  <Input value={name} onChange={onNameChange} />
                  <Sp />
                  <Slider
                    value={bombacity}
                    radius={0.3}
                    orientation="horizontal"
                    onChange={onBombacityChange}
                  />
                </Column>
              ) : (
                <>
                  <div>{name}</div>
                  <div style={{ flex: '1 0 0' }} />
                  <IconButton
                    aria-label="delete scene"
                    size="small"
                    onClick={onRemoveScene}
                  >
                    <CloseIcon />
                  </IconButton>
                </>
              )}
              <div {...provided.dragHandleProps}>
                <DragHandleIcon />
              </div>
            </Root>
          </ButtonMidiOverlay>
        </div>
      )}
    </Draggable>
  )
}

export function NewScene({ sceneType }: { sceneType: SceneType }) {
  const dispatch = useDispatch()
  const onNew = () => {
    dispatch(newScene(sceneType))
  }
  const onCopy = () => {
    dispatch(copyActiveScene(sceneType))
  }

  return (
    <Root>
      <IconButton onClick={onNew}>
        <AddIcon />
      </IconButton>
      <IconButton onClick={onCopy}>
        <CopyIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  color: #fffa;
  border-radius: 7px;
  box-sizing: border-box;
  border: 1px solid #7777;
  :hover {
    border: 1px solid;
    cursor: pointer;
  }
`

const Number = styled.div`
  width: 1rem;
  font-size: 0.7rem;
  margin-left: -0.3rem;
  margin-right: 1rem;
  text-align: right;
`

const Column = styled.div`
  flex: 1 0 auto;
  margin-right: 1rem;
`

const Sp = styled.div`
  height: 0.5rem;
`
