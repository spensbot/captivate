import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import {
  queryVisualizerDetachedFullscreen,
  setVisualizerDetachedFullscreen,
} from '../ipcHandler'

/**
 * OS fullscreen toggle for the minimal visualizer popout (`page=VideoViewport` only).
 */
export default function DetachedVisualizerFullscreenBar() {
  const [full, setFull] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setFull(await queryVisualizerDetachedFullscreen())
    } catch {
      setFull(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (t !== null) {
        clearTimeout(t)
      }
      t = setTimeout(() => {
        t = null
        void refresh()
      }, 120)
    }
    window.addEventListener('resize', scheduleRefresh)
    return () => {
      window.removeEventListener('resize', scheduleRefresh)
      if (t !== null) {
        clearTimeout(t)
      }
    }
  }, [refresh])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        void (async () => {
          const next = await setVisualizerDetachedFullscreen()
          setFull(next)
        })()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggle = () => {
    void (async () => {
      const next = await setVisualizerDetachedFullscreen()
      setFull(next)
    })()
  }

  return (
    <Bar>
      <Hint>F11</Hint>
      <Btn
        type="button"
        onClick={toggle}
        title={full ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
      >
        {full ? (
          <FullscreenExitIcon sx={{ fontSize: '1rem' }} />
        ) : (
          <FullscreenIcon sx={{ fontSize: '1rem' }} />
        )}
        {full ? 'Exit fullscreen' : 'Fullscreen'}
      </Btn>
    </Bar>
  )
}

const Bar = styled.div`
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.2rem 0.38rem;
  border-radius: 0.3rem;
  background: rgba(12, 16, 28, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  pointer-events: auto;
`

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: none;
  border-radius: 0.22rem;
  padding: 0.22rem 0.42rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: #e8eefc;
  background: rgba(80, 120, 200, 0.35);
  cursor: pointer;

  &:hover {
    background: rgba(100, 140, 220, 0.48);
  }
`

const Hint = styled.span`
  font-size: 0.58rem;
  color: rgba(220, 228, 245, 0.5);
  user-select: none;
`
