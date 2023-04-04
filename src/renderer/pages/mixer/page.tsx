import styled from 'styled-components'
import Slider from '../../../features/ui/react/base/Slider'
import { useTypedSelector, useDmxSelector } from '../../redux/store'
import { useDispatch } from 'react-redux'
import { TextField, Button, IconButton } from '@mui/material'
import ForwardIcon from '@mui/icons-material/ArrowForward'
import BackIcon from '@mui/icons-material/ArrowBack'
import {
  setPageIndex,
  setChannelsPerPage,
  setOverwrite,
  clearOverwrites,
} from '../../redux/mixerSlice'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import StatusBar from '../../../features/menu/react/StatusBar'
import React from 'react'
import useHover from 'features/ui/react/hooks/useHover'
import { DMX_MAX_VALUE, FixtureChannel, FixtureType } from 'features/dmx/shared/dmxFixtures'
import zIndexes from 'renderer/zIndexes'
import useMousePosition from 'features/ui/react/hooks/useMousePosition'

export default function Mixer() {
  const _s = useTypedSelector((state) => state.mixer)

  const minIndex = _s.pageIndex * _s.channelsPerPage
  const maxIndex = Math.min(minIndex + _s.channelsPerPage, DMX_MAX_VALUE)
  const dmxIndexes: number[] = []
  for (let i = minIndex; i < maxIndex; i++) {
    dmxIndexes.push(i)
  }

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
  overflow: auto;
  margin: 0 1rem;
`

function Header() {
  const dispatch = useDispatch()
  const _s = useTypedSelector((state) => state.mixer)
  const hasOverwrites = useTypedSelector(
    (state) => state.mixer.overwrites.length > 0
  )
  const canGoBack = _s.pageIndex > 0
  const canGoForward = (_s.pageIndex + 1) * _s.channelsPerPage < DMX_MAX_VALUE

  return (
    <HeaderRoot>
      <HeaderTitle>DMX Out</HeaderTitle>
      <S />
      <IconButton
        disabled={!canGoBack}
        onClick={() => dispatch(setPageIndex(_s.pageIndex - 1))}
      >
        <BackIcon />
      </IconButton>
      <S />
      <Page>{_s.pageIndex + 1}</Page>
      <S />
      <IconButton
        disabled={!canGoForward}
        onClick={() => dispatch(setPageIndex(_s.pageIndex + 1))}
      >
        <ForwardIcon />
      </IconButton>
      <S />
      <TextField
        value={_s.channelsPerPage.toString()}
        size="small"
        onChange={(e) => dispatch(setChannelsPerPage(parseInt(e.target.value)))}
        type="number"
      />
      <S />
      <Button
        disabled={!hasOverwrites}
        variant="contained"
        onClick={() => dispatch(clearOverwrites())}
      >
        Reset Overwrites
      </Button>
    </HeaderRoot>
  )
}

const HeaderTitle = styled.div`
  font-size: 1.3rem;
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
`

const S = styled.div`
  width: 1rem;
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
  const overwrite: number | undefined = useTypedSelector(
    (state) => state.mixer.overwrites[index]
  )
  const [status, fixtureIndex]: [Status_t, number | null] = useDmxSelector(
    (state) => {
      let i = 0
      for (const f of state.universe) {
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
  const output: number = useRealtimeSelector((state) => state.dmxOut[index])
  const dispatch = useDispatch()
  const { hoverDiv, isHover } = useHover()

  const onChange = (newVal: number) => {
    dispatch(setOverwrite({ index: index, value: newVal }))
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
    // left: '1rem',
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
    // right: '1rem',
    right: '0.2rem',
    borderLeft: 'none',
  },
  none: {
    border: 'none',
  },
}

function InfoCursor({ index }: { index: number }) {
  const ch = index + 1
  const output: number = useRealtimeSelector((state) => state.dmxOut[index])
  const pos = useMousePosition()
  const [fixtureType, fixtureChannel]: [
    FixtureType | null,
    FixtureChannel | null
  ] = useDmxSelector((state) => {
    for (const f of state.universe) {
      const ft = state.fixtureTypesByID[f.type]
      const fc = ft.channels[ch - f.ch]
      const endChannel = f.ch + ft.channels.length - 1
      if (ch >= f.ch && ch <= endChannel) return [ft, fc]
    }
    return [null, null]
  })

  return (
    <Info style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
      <Val>{Math.floor(output)}</Val>
      <FixtureName>{fixtureType?.name}</FixtureName>
      <FixtureChannelName>{fixtureChannel?.type}</FixtureChannelName>
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
