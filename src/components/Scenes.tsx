import React from 'react'
import { useTypedSelector } from '../redux/store'
import { makeStyles } from '@material-ui/core/styles'
import { useDispatch } from 'react-redux'

const height = 6
const width = 6

const useStyles = makeStyles({
  root: {
    height: `${height}rem`,
    padding: '0.5rem',
    minWidth: `${width}rem`,
    marginRight: '0.3rem',
    marginBottom: '0.3rem',
    color: "#fff8"
  },
  selected: {
    padding: '0.4rem',
    border: '0.1rem solid #fffa',
    color: '#fffc'
  },

})

function Scene() {
  const classes = useStyles()
  const dummySelector = useTypedSelector(state => 0)
  const dispatch = useDispatch()
  return (
    <div className={`${classes.root} ${Math.random() > 0.5 ? classes.selected : null}`} onClick={() => { dispatch(setSelectedFixture(index))} }>
      Scene {dummySelector}
    </div>
  )
}

let array = Array.from(Array(5).keys())

export default function Scenes() {
  return (
    <div style={{ backgroundColor: '#0006', padding: '0.5rem'}}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Scenes</div>
      <div style={{ display: 'flex' }}>
        {array.map(index => {
          return (
            <Scene key={index} />
          )
        })}
      </div>
    </div>
  )
}
