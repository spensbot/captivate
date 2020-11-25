import React, {useState} from 'react';

type Input = {
  defaultRatio: number,
  horizontal?: boolean,
  left: any,
  right: any
}

export default function SplitPane({defaultRatio, horizontal, left, right}: Input) {
  const [ratio, setRatio] = useState(defaultRatio);

  const thickness = '0.5rem'

  const styles = {
    root: {
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      width: '100%'
    },
    left: {
      flex: `${ratio} 0 0`,
      height: '100%'
    },
    right: {
      flex: `${1-ratio} 0 0`,
      height: '100%'
    },
    divider: {
      width: thickness,
      height: '100%',
      backgroundColor: '#777777',
      '&:hover': {cursor: horizontal ? 'ns-resize' : 'ew-resize'}
    }
  }


  return (
    <div style={styles.root}>
      <div style={styles.left}>
        Left
        {left}
      </div>
      <div style={styles.divider} draggable="true" onDrag={onDrag}>Center</div>
      <div style={styles.right}>
        right
        {right}
      </div>
    </div>
  )
}
