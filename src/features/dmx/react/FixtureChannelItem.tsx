import styled from 'styled-components'
import { useDmxSelector } from '../../../renderer/redux/store'
import { useDispatch } from 'react-redux'
import { IconButton } from '@mui/material'
import FixtureChannelPopup from 'features/dmx/react/FixtureChannelPopup'
import Popup from '../../../renderer/base/Popup'
import RemoveIcon from '@mui/icons-material/Remove'
import { FixtureChannel } from '../../../shared/dmxFixtures'
import { removeFixtureChannel } from '../../../renderer/redux/dmxSlice'
import { getCustomColorChannelName } from '../../../shared/dmxColors'
import { ChannelToggle } from './Subfixtures'

export interface FixtureChannelItemProps {
  fixtureID: string
  channelIndex: number
  channelCount: number
  hasMaster: boolean
  isInUse: boolean
  editing: number | null
  setEditing: (ch: number | null) => void
}

export default function FixtureChannelItem(props: FixtureChannelItemProps) {
  const {
    fixtureID,
    channelIndex,
    channelCount,
    editing,
    setEditing,
    isInUse,
  } = props
  const ch = useDmxSelector(
    (state) => state.fixtureTypesByID[fixtureID].channels[channelIndex]
  )

  const dispatch = useDispatch()

  const props3 = { ...props, ch: ch }

  return (
    <Root2
      onClick={(e) => {
        if (!e.defaultPrevented) {
          e.preventDefault()
          setEditing(channelIndex)
        }
      }}
      style={{ opacity: 1.0 }}
    >
      <ChannelToggle channelIndex={channelIndex} />
      <Ch>{`${channelIndex + 1}`}</Ch>
      <Info>{`${getInfo(ch)}`}</Info>
      <SubInfo>{getSubInfo(ch)}</SubInfo>
      <Sp />
      {!isInUse && channelCount > 1 && (
        <IconButton
          size="small"
          style={{ margin: '-0.9rem 0' }}
          onClick={(e) => {
            e.preventDefault()
            dispatch(
              removeFixtureChannel({
                fixtureID: fixtureID,
                channelIndex: channelIndex,
              })
            )
          }}
        >
          <RemoveIcon />
        </IconButton>
      )}
      {editing === channelIndex && (
        <Popup
          title={`Channel ${channelIndex + 1}`}
          onClose={() => {
            setEditing(null)
          }}
        >
          <FixtureChannelPopup {...props3} />
        </Popup>
      )}
    </Root2>
  )
}

const Root2 = styled.div`
  display: flex;
  align-items: center;
  padding: 0.3rem;
  cursor: pointer;
  :hover {
    background-color: ${(props) => props.theme.colors.bg.lighter};
  }
`

const Ch = styled.div`
  font-size: 1rem;
  margin-right: 0.7rem;
`

const Info = styled.div`
  font-size: 0.9rem;
  margin-right: 0.5rem;
`

const SubInfo = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
`

const Sp = styled.div`
  flex: 1 0 0;
`

function getInfo(ch: FixtureChannel): string {
  switch (ch.type) {
    case 'axis':
      return `${ch.dir} Axis`
    case 'color':
      return getCustomColorChannelName(ch.color)
    case 'colorMap':
      return `Color Map`
    case 'master':
      return `Master`
    case 'other':
      return `Other`
    case 'strobe':
      return `Strobe`
    case 'reset':
      return `Reset`
    case 'custom':
      return `${ch.name}`
  }
}

function getSubInfo(ch: FixtureChannel): string | null {
  switch (ch.type) {
    case 'axis':
      return ch.isFine ? 'fine' : `${ch.min} - ${ch.max}`
    case 'colorMap':
      return `${ch.colors.length} colors`
    case 'other':
      return `Default: ${ch.default}`
    case 'strobe':
      return `Solid: ${ch.default_solid} | Strobe: ${ch.default_strobe}`
    case 'master':
      return `${ch.min} - ${ch.max}`
    case 'reset':
      return `val: ${ch.resetVal}`
    default:
      return null
  }
}
