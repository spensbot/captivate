import styled from 'styled-components'
import Slider from '../base/Slider'
import {
  useTypedSelector,
  useDmxSelector,
  useControlSelector,
} from '../redux/store'
import { useDispatch } from 'react-redux'
import { Button, IconButton, Tooltip } from '@mui/material'
import ForwardIcon from '@mui/icons-material/ArrowForward'
import BackIcon from '@mui/icons-material/ArrowBack'
import {
  setActiveMixerUniverse,
  setOverwrite,
  clearOverwrites,
  getUniverseOverwrites,
} from '../redux/mixerSlice'
import { useRealtimeSelector } from '../redux/realtimeStore'
import StatusBar from '../menu/StatusBar'
import React from 'react'
import useHover from 'renderer/hooks/useHover'
import {
  DMX_NUM_CHANNELS,
  FixtureChannel,
  FixtureType,
  axisDirName,
} from 'shared/dmxFixtures'
import zIndexes from 'renderer/zIndexes'
import useMousePosition from 'renderer/hooks/useMousePosition'
import { getCustomColorChannelName } from 'shared/dmxColors'

export default function Mixer() {
  const dmxIndexes = Array.from({ length: DMX_NUM_CHANNELS }, (_, i) => i)

  return (
    <Root>
      <StatusBar />
      <Header />
      <LabelledSliderWrapper>
        {dmxIndexes.map((i) => (
          <LabelledSlider key={i} index={i} />
        ))}
      </LabelledSliderWrapper>
    </Root>
  )
}

const Root = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`

const LabelledSliderWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0 1rem;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a33 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

function Header() {
  const dispatch = useDispatch()
  const _s = useTypedSelector((state) => state.mixer)
  const universeCount = useControlSelector(
    (state) => state.device.connectionSettings.universeCount
  )
  const hasOverwrites = useTypedSelector((state) =>
    getUniverseOverwrites(state.mixer, state.mixer.activeUniverse).some(
      (overwrite) => overwrite !== undefined
    )
  )
  const canGoBack = _s.activeUniverse > 1
  const canGoForward = _s.activeUniverse < universeCount

  return (
    <HeaderRoot>
      <HeaderTitle>DMX Out</HeaderTitle>
      <S />
      <UniverseLabel>Universe</UniverseLabel>
      <SSmall />
      <Tooltip title="Show previous universe">
        <span>
          <IconButton
            disabled={!canGoBack}
            onClick={() => dispatch(setActiveMixerUniverse(_s.activeUniverse - 1))}
          >
            <BackIcon />
          </IconButton>
        </span>
      </Tooltip>
      <SSmall />
      <Tooltip title="Active universe displayed in DMX output">
        <Page>{_s.activeUniverse}</Page>
      </Tooltip>
      <SSmall />
      <Tooltip title="Show next universe">
        <span>
          <IconButton
            disabled={!canGoForward}
            onClick={() => dispatch(setActiveMixerUniverse(_s.activeUniverse + 1))}
          >
            <ForwardIcon />
          </IconButton>
        </span>
      </Tooltip>
      <S />
      <Tooltip title="Clear manual slider overwrites for this universe">
        <span>
          <Button
            disabled={!hasOverwrites}
            variant="contained"
            onClick={() => dispatch(clearOverwrites(_s.activeUniverse))}
          >
            Reset Overwrites
          </Button>
        </span>
      </Tooltip>
    </HeaderRoot>
  )
}

const HeaderTitle = styled.div`
  font-size: 1.3rem;
`

const UniverseLabel = styled.div`
  font-size: 0.9rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const HeaderRoot = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1rem;
  margin-left: 1rem;
  margin-bottom: 1rem;
`

const Page = styled.span`
  font-size: 1.1rem;
  min-width: 1.8rem;
  text-align: center;
`

const S = styled.div`
  width: 1rem;
`

const SSmall = styled.div`
  width: 0.35rem;
`

function getColor(index: number | null) {
  if (index !== null) {
    const hue = (40 + index * 50) % 360
    return `hsla(${hue}, 100%, 30%, 0.5)`
  }
  return '#0000'
}

type Status_t = 'single' | 'begin' | 'mid' | 'end' | 'none'

function LabelledSlider({ index }: { index: number }) {
  const ch = index + 1
  const activeUniverse = useTypedSelector((state) => state.mixer.activeUniverse)
  const overwrite: number | undefined = useTypedSelector(
    (state) => getUniverseOverwrites(state.mixer, state.mixer.activeUniverse)[index]
  )
  const [status, fixtureIndex]: [Status_t, number | null] = useDmxSelector(
    (state) => {
      let i = 0
      for (const f of state.universe) {
        if ((f.universe ?? 1) !== activeUniverse) {
          continue
        }

        const ft = state.fixtureTypesByID[f.type]
        const endChannel = f.ch + ft.channels.length - 1
        if (ch == f.ch) {
          if (ch == endChannel) {
            return ['single', i]
          } else {
            return ['begin', i]
          }
        }
        if (ch == endChannel) return ['end', i]
        if (ch > f.ch && ch < endChannel) return ['mid', i]
        i += 1
      }
      return ['none', null]
    }
  )
  const output: number = useRealtimeSelector(
    (state) => state.dmxOutByUniverse[activeUniverse - 1]?.[index] ?? 0
  )
  const dispatch = useDispatch()
  const { hoverDiv, isHover } = useHover()

  const onChange = (newVal: number) => {
    dispatch(setOverwrite({ index: index, value: newVal, universe: activeUniverse }))
  }

  return (
    <Col ref={hoverDiv}>
      <Slider
        value={output / 255}
        radius={0.5}
        onChange={onChange}
        orientation="vertical"
        disabled={overwrite === undefined}
        color={overwrite !== undefined ? '#b1b1ff' : undefined}
      />
      <Div>
        <Status
          style={{
            ...statusStyles[status],
            backgroundColor: getColor(fixtureIndex),
          }}
        />
        <Label>{ch.toString()}</Label>
      </Div>
      {isHover && <InfoCursor index={index} />}
    </Col>
  )
}

const Col = styled.div`
  height: 14rem;
  width: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-bottom: 1rem;
`

const Div = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-top: 0.5rem;
  height: 1.5rem;
  width: 100%;
`

const Label = styled.div`
  color: #ddd;
  font-size: 0.8rem;
  z-index: 1;
`

const Status = styled.div`
  position: absolute;

  height: 100%;

  left: 0;
  right: 0;
  border: 1px solid #fff7;
`

const statusStyles: { [key in Status_t]: React.CSSProperties } = {
  single: {
    borderRadius: '1rem',
    left: '0.2rem',
    right: '0.2rem',
  },
  begin: {
    borderTopLeftRadius: '1rem',
    borderBottomLeftRadius: '1rem',
    left: '0.2rem',
    borderRight: 'none',
  },
  mid: {
    borderRight: 'none',
    borderLeft: 'none',
  },
  end: {
    borderTopRightRadius: '1rem',
    borderBottomRightRadius: '1rem',
    right: '0.2rem',
    borderLeft: 'none',
  },
  none: {
    border: 'none',
  },
}

function InfoCursor({ index }: { index: number }) {
  const ch = index + 1
  const activeUniverse = useTypedSelector((state) => state.mixer.activeUniverse)
  const output: number = useRealtimeSelector(
    (state) => state.dmxOutByUniverse[activeUniverse - 1]?.[index] ?? 0
  )
  const pos = useMousePosition()
  const [fixtureType, fixtureChannel]: [
    FixtureType | null,
    FixtureChannel | null
  ] = useDmxSelector((state) => {
    for (const f of state.universe) {
      if ((f.universe ?? 1) !== activeUniverse) {
        continue
      }

      const ft = state.fixtureTypesByID[f.type]
      const fc = ft.channels[ch - f.ch]
      const endChannel = f.ch + ft.channels.length - 1
      if (ch >= f.ch && ch <= endChannel) return [ft, fc]
    }
    return [null, null]
  })

  const fixtureName = fixtureType?.name
  let fixtureChannelName: string = fixtureChannel?.type ?? 'N/A'
  if (fixtureChannel?.type === 'custom') {
    fixtureChannelName = fixtureChannel.name
  }
  if (fixtureChannel?.type === 'axis') {
    fixtureChannelName = axisDirName(fixtureChannel.dir)
  }
  if (fixtureChannel?.type === 'color') {
    fixtureChannelName = getCustomColorChannelName(fixtureChannel.color)
  }
  if (fixtureChannel?.type === 'goboMap') {
    fixtureChannelName = 'Gobo Map'
  }

  return (
    <Info style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
      <Val>{Math.floor(output)}</Val>
      <FixtureName>{fixtureName}</FixtureName>
      <FixtureChannelName>{fixtureChannelName}</FixtureChannelName>
    </Info>
  )
}

const Info = styled.div`
  position: fixed;
  z-index: ${zIndexes.popups};
  margin-left: 1rem;
  color: #111;
  background-color: #eee;
  padding: 0.15rem 0.3rem;
  opacity: 0.8;
  box-shadow: 0px 2px 10px 0px #000000;
  border-radius: 3px;
`

const Val = styled.div`
  font-size: 1rem;
`

const FixtureName = styled.div``

const FixtureChannelName = styled.div``

