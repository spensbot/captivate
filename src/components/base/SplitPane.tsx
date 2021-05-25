import React, { useState } from 'react'
import useDragMapped from '../hooks/useDragMapped'

type Props = {
  type: 'vertical' | 'horizontal'
  rem: number
  initialSplit: number

  style: React.CSSProperties
  children: React.ReactElement[]
}

export default function SplitPane({type='vertical', rem=1, initialSplit=0.5, style, children}: Props) {
  const v = type === 'vertical'

  const [split, setSplit] = useState(initialSplit)

  const [dragContainer, onMouseDown] = useDragMapped(({x, y}) => {
    setSplit(v ? x : 1-y)
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      display: 'flex',
      flexDirection: v ? 'row' : 'column',
      height: '100%',
      width: '100%'
    },
    child1: {
      flex: `${split} 0 0`,
      height: v ? '100%' : undefined,
      width: v ? undefined : '100%',
      overflow: 'auto'
    },
    child2: {
      flex: `${1 - split} 0 0`,
      height: v ? '100%' : undefined,
      width: v ? undefined : '100%',
      overflow: 'auto'
    },
    divider: {
      width: v ? `${rem}rem` : '100%',
      height: v ? '100%' : `${rem}rem`,
      cursor: v ? 'ew-resize' : 'ns-resize',
      margin: v ? `0 -${rem / 2}rem` : `-${rem / 2}rem 0`,
      zIndex: 1
    }
  }

  return (
    <div style={style} ref={dragContainer}>
      <div style={styles.root}>
        <div style={styles.child1}>{children[0]}</div>
        <div style={styles.divider} onMouseDown={onMouseDown}></div>
        <div style={styles.child2}>{children[1]}</div>
      </div>
    </div>
  )
}
