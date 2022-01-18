import styled from 'styled-components'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import {
  setActiveScene,
  addScene,
  removeScene,
  setActiveSceneBombacity,
  setActiveSceneName,
  copyActiveScene,
} from '../redux/scenesSlice'
import { nanoid } from 'nanoid'
import { initScene } from '../../engine/scene_t'
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
  // const min = 100
  // const range = 100
  // const r = min + bombacity * range
  // const g = min
  // const b = min + (1-bombacity) * range
  // return `rgb(${r}, ${g}, ${b})`
  const hueStart = 250
  const hueRange = 110 // 170
  const hue = (hueStart + bombacity * hueRange) % 360
  return `hsl(${hue}, ${40}%, ${50}%)`
}

export function Scene({ index, id }: { index: number; id: string }) {
  const isActive = useTypedSelector((state) => state.scenes.active === id)
  const dispatch = useDispatch()
  const bombacity = useTypedSelector((state) => state.scenes.byId[id].bombacity)
  const name = useTypedSelector((state) => state.scenes.byId[id].name)

  const onNameChange = (newVal: string) => {
    dispatch(setActiveSceneName(newVal))
  }

  const onBombacityChange = (val: number) => {
    dispatch(setActiveSceneBombacity(val))
  }

  const onRemoveScene = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation()
    dispatch(removeScene({ index: index }))
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
            action={{ type: 'setActiveSceneIndex', index: index }}
          >
            <Root
              style={style}
              onClick={() => {
                dispatch(setActiveScene(id))
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

export function NewScene() {
  const dispatch = useDispatch()
  const onNew = () => {
    dispatch(addScene({ id: nanoid(), scene: initScene() }))
  }
  const onCopy = () => {
    dispatch(copyActiveScene())
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
