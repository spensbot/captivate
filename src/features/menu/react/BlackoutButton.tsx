import React from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../../renderer/redux/store'
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt'
import { setBlackout } from '../../ui/redux/guiSlice'

export default function BlackoutButton() {
  const dispatch = useDispatch()
  const blackout = useTypedSelector((state) => state.gui.blackout)

  const style: React.CSSProperties = {
    backgroundColor: '#111',
    color: '#ff9',
    padding: '0.75rem',
    cursor: 'pointer',
    opacity: blackout ? 0.1 : 0.8,
  }

  return (
    <div
      style={style}
      onClick={() => {
        dispatch(setBlackout(!blackout))
      }}
    >
      <OfflineBoltIcon style={{ width: '2rem', height: '2rem' }} />
    </div>
  )
}
