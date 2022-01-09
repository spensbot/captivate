import styled from 'styled-components'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import {} from '../redux/connectionsSlice'
import Popup from '../base/Popup'

interface Props {}

export default function DmxTroubleshooter({}: Props) {
  const isOn = useTypedSelector((state) => state.connections.dmx.isTroubleshoot)
  const dispatch = useDispatch()

  if (!isOn) return null

  return (
    <Popup title="DMX Connection Troubleshoot" onClose={() => {}}>
      {null}
    </Popup>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
`
