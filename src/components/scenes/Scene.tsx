import React from 'react'
import { useTypedSelector } from '../../redux/store'
import { useDispatch } from 'react-redux'
import { setActiveScene, addScene, removeScene, setActiveSceneBombacity, setActiveSceneName } from '../../redux/scenesSlice'
import { nanoid } from 'nanoid'
import { initScene } from '../../engine/scene_t'
import { IconButton } from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import AddIcon from '@material-ui/icons/Add'
import Slider from '../base/Slider'

const baseStyle: React.CSSProperties = {
  padding: '0.5rem',
  marginRight: '0.3rem',
  marginBottom: '0.3rem',
  display: 'flex',
  alignItems: 'center',
  color: '#fffa'
}

const activeStyle: React.CSSProperties = {
  ...baseStyle,
  border: '0.1rem solid #fffa',
  color: '#fffc'
}

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
  return `hsl(${hue}, ${50}%, ${50}%)`
}

export function Scene({ index, id }: { index: number, id: string }) {
  const isActive = useTypedSelector(state => state.scenes.active === id)
  const dispatch = useDispatch()
  const bombacity = useTypedSelector(state => state.scenes.byId[id].bombacity)
  const name = useTypedSelector(state => state.scenes.byId[id].name)

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setActiveSceneName(e.target.value))
  }
  
  const onBombacityChange = (val: number) => { 
    dispatch(setActiveSceneBombacity(val))
  }

  const onRemoveScene = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation()
    dispatch(removeScene({ index: index }))
  }

  let style = isActive ? activeStyle : baseStyle
  style = {
    ...style,
    backgroundColor: getColor(bombacity)
  }

  return (
    <div style={style} onClick={() => { dispatch(setActiveScene(id)) }}>
      <div style={{
        width: '1rem',
        fontSize: '0.7rem',
        marginLeft: '-0.3rem',
        marginRight: '0.5rem',
        textAlign: 'right',
      }}>{index + 1}</div>
      { isActive ? (
        <div style={{flex: '1 0 auto'}}>
          <input style={{ border: 'none', color: '#fff', backgroundColor: '#fff1', width: '100%', marginBottom: '0.5rem', fontSize: '1rem' }} type="text" value={name} onChange={onNameChange} />
          <Slider value={bombacity} radius={0.3} orientation="horizontal" onChange={onBombacityChange} />
        </div>
      ) : (
        <>
        <div>{name}</div>
        <div style={{flex: '1 0 0'}} />
        <IconButton aria-label="delete scene" size="small" onClick={onRemoveScene}>
          <CloseIcon />
        </IconButton>
        </>
      )}
    </div>
  )
}

// function DisabledScene() {

//   return (
//     <div style={styles.root} className={`${classes.root} ${isSelected ? classes.selected : null}`} onClick={() => { dispatch(setActiveScene(id))} }>
//       <IconButton aria-label="delete" size="small" onClick={e => {
//         e.stopPropagation()
//         dispatch(removeScene({ index: index }))
//       }}>
//         <CloseIcon />
//       </IconButton>
//     </div>
//   )
// }

// function EnabledScene() {
//   const dispatch = useDispatch()
//   const bombacity = useTypedSelector(state => state.scenes.byId[id].bombacity)
//   const name = useTypedSelector(state => state.scenes.byId[id].name)

//   return (
//     <div style={styles.root} className={`${classes.root} ${isSelected ? classes.selected : null}`} >

//     </div>
//   )
// }

export function NewScene() {
  const dispatch = useDispatch()
  const onClick = () => {
    dispatch(addScene({ id: nanoid(), scene: initScene() }))
  }
  return (
    <div style={baseStyle} onClick={onClick}>
      <AddIcon />
    </div>
  )
}
