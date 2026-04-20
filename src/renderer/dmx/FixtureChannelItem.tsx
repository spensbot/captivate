import styled from 'styled-components'
import { useDmxSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { IconButton } from '@mui/material'
import FixtureChannelPopup from './FixtureChannelPopup'
import Popup from '../base/Popup'
import RemoveIcon from '@mui/icons-material/Remove'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import { FixtureChannel, axisDirName } from '../../shared/dmxFixtures'
import { removeFixtureChannel } from '..//redux/dmxSlice'
import { getCustomColorChannelName } from '../../shared/dmxColors'
import { ChannelToggle } from './Subfixtures'
import { FixtureChannelItemProps } from './FixtureChannelTypes'

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
  const canEditPrevious = channelIndex > 0
  const canEditNext = channelIndex < channelCount - 1

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
          title={
            <PopupTitleRow>
              <PopupTitleText>{`Channel ${channelIndex + 1}`}</PopupTitleText>
              <PopupTitleActions>
                <IconButton
                  size="small"
                  disabled={!canEditPrevious}
                  title="Previous Channel"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (!canEditPrevious) return
                    setEditing(channelIndex - 1)
                  }}
                >
                  <ArrowBackIosNewIcon fontSize="inherit" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={!canEditNext}
                  title="Next Channel"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (!canEditNext) return
                    setEditing(channelIndex + 1)
                  }}
                >
                  <ArrowForwardIosIcon fontSize="inherit" />
                </IconButton>
              </PopupTitleActions>
            </PopupTitleRow>
          }
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

const PopupTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const PopupTitleText = styled.div`
  font-size: 1rem;
`

const PopupTitleActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
`

function getInfo(ch: FixtureChannel): string {
  switch (ch.type) {
    case 'axis':
      return axisDirName(ch.dir)
    case 'color':
      return getCustomColorChannelName(ch.color)
    case 'colorMap':
      return `Color Map`
    case 'goboMap':
      return `Gobo Map`
    case 'master':
      return `Master`
    case 'strobe':
      return `Strobe`
    case 'fxTrigger':
      return ch.name.length > 0 ? ch.name : 'FX Trigger'
    case 'fxLevel':
      return ch.name.length > 0 ? ch.name : 'FX Level'
    case 'custom':
      return ch.isControllable ? ch.name : ''
    case 'split':
      return ch.ranges.length > 0 ? ch.ranges[0].name : 'Split'
  }
}

function getSubInfo(ch: FixtureChannel): string | null {
  switch (ch.type) {
    case 'axis':
      return ch.isFine ? 'fine' : `${ch.min} - ${ch.max}`
    case 'colorMap':
      return `${ch.colors.length} colors`
    case 'goboMap':
      return `${ch.gobos.length} gobos`
    case 'strobe':
      return `Solid: ${ch.default_solid} | Strobe: ${ch.default_strobe}`
    case 'fxTrigger':
      return `Off: ${ch.off} | On: ${ch.on}`
    case 'fxLevel':
      return `${ch.min} - ${ch.max} | Default: ${ch.default}`
    case 'master':
      return `${ch.min} - ${ch.max}`
    case 'custom':
      return ch.isControllable ? '' : ch.name
    case 'split':
      return `${ch.ranges.length} range${ch.ranges.length === 1 ? '' : 's'}`
    default:
      return null
  }
}
