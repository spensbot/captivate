import React from 'react'
import { useTypedSelector } from '../redux/store'
import FixtureCursor from './FixtureCursor'
import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setFixtureWindow, incrementFixtureWindow } from '../redux/dmxSlice'

export default function FixturePlacement() {
  const universe = useTypedSelector((state) => state.dmx.universe)
  const selectedFixture = useTypedSelector((state) => state.dmx.selectedFixture)
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y, dx, dy }, e) => {
    if (selectedFixture !== null) {
      if (e.metaKey) {
        dispatch(
          incrementFixtureWindow({
            index: selectedFixture,
            dWidth: dx,
            dHeight: dy,
          })
        )
      } else {
        dispatch(
          setFixtureWindow({
            index: selectedFixture,
            x: x,
            y: y,
          })
        )
      }
    }
  })

  const indexes = Array.from(Array(universe.length).keys())

  const cursors = indexes.map((index) => {
    return <FixtureCursor key={index} index={index} />
  })

  const styles: { [key: string]: React.CSSProperties } = {
    vertical: {
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: '50%',
      width: '1px',
      backgroundColor: '#fff3',
    },
    horizontal: {
      position: 'absolute',
      top: '50%',
      height: '1px',
      left: 0,
      right: 0,
      backgroundColor: '#fff3',
    },
  }

  return (
    <div
      style={{
        backgroundColor: '#0007',
        width: '100%',
        height: '60%',
        overflow: 'hidden',
        padding: '0.5rem',
        flex: '1 0 50%',
      }}
    >
      <div
        ref={dragContainer}
        onMouseDown={onMouseDown}
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        <div style={styles.vertical} />
        <div style={styles.horizontal} />
        {cursors}
      </div>
    </div>
  )
}
