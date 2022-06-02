import { useState, useEffect } from 'react'

interface Props {
  children: React.ReactNode
  text: string
  style?: React.CSSProperties
}

const delay = 1000

export default function TooltipWrapper({ children, text, style = {} }: Props) {
  const [visible, setVisible] = useState(false)
  const [timeoutRef, setTimeoutRef] = useState<NodeJS.Timeout>()

  let onTimeout = () => {
    setVisible(true)
  }

  useEffect(() => {
    return () => {
      onTimeout = () => {}
    }
  })

  function onMouseEnter() {
    setTimeoutRef(setTimeout(onTimeout, delay))
  }

  function onMouseLeave() {
    if (timeoutRef) {
      clearTimeout(timeoutRef)
    }
    setVisible(false)
  }

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      position: 'relative',
    },
    tooltip: {
      minWidth: '8rem',
      maxWidth: '13rem',
      boxShadow: '3px 5px 10px 3px #0008',
      padding: '0.3rem',
      position: 'absolute',
      zIndex: 1,
      top: '0.2rem',
      left: '95%',
      fontSize: '0.8rem',
      backgroundColor: '#fff',
      color: '#000',
      // backgroundColor: '#000',
      // border: '1px solid #222',
      // borderRadius: '0.5rem',
    },
  }

  return (
    <div
      style={{ ...style, ...styles.root }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      {visible ? <span style={styles.tooltip}>{text}</span> : null}
    </div>
  )
}
