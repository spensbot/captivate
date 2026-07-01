import styled from 'styled-components'
import SliderBase from '../base/SliderBase'
import LiveDmxSliderCursor from '../controls/LiveDmxSliderCursor'
import {
  useTypedSelector,
  useDmxSelector,
  useControlSelector,
} from '../redux/store'
import { useDispatch } from 'react-redux'
import { Button, FormControlLabel, IconButton, Switch } from '@mui/material'
import ForwardIcon from '@mui/icons-material/ArrowForward'
import BackIcon from '@mui/icons-material/ArrowBack'
import { BriefTooltip } from '../base/appTooltip'
import { MixerHelpButton } from '../globalHelpButtons'
import { PopupTitleRow } from '../base/SectionHelpPopover'
import {
  setActiveMixerUniverse,
  setOverwrite,
  clearOverwrites,
  getUniverseOverwrites,
  setMixerShowAllChannels,
} from '../redux/mixerSlice'
import type { DmxState } from '../redux/dmxSlice'
import { useDmxMixerChannelOutput } from '../dmx/dmxMixerOutputBus'
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import StatusBar from '../menu/StatusBar'
import useHover from 'renderer/hooks/useHover'
import {
  DMX_NUM_CHANNELS,
  FixtureChannel,
  axisDirName,
} from 'shared/dmxFixtures'
import zIndexes from 'renderer/zIndexes'
import useMousePosition from 'renderer/hooks/useMousePosition'
import { getCustomColorChannelName } from 'shared/dmxColors'
import useDragMapped from '../hooks/useDragMapped'
import { useRemoteMobileLayout } from '../hooks/useRemoteMobileLayout'

function buildAssignedChannelIndices(
  dmx: DmxState,
  activeUniverse: number
): number[] {
  const set = new Set<number>()
  for (const f of dmx.universe) {
    if ((f.universe ?? 1) !== activeUniverse) {
      continue
    }
    const ft = dmx.fixtureTypesByID[f.type]
    if (!ft?.channels) {
      continue
    }
    const n = ft.channels.length
    for (let i = 0; i < n; i++) {
      const idx = f.ch - 1 + i
      if (idx >= 0 && idx < DMX_NUM_CHANNELS) {
        set.add(idx)
      }
    }
  }
  return [...set].sort((a, b) => a - b)
}

export default function Mixer({
  hideStatusBar = false,
  mobileTouchFaders = false,
}: {
  hideStatusBar?: boolean
  /** Remote mobile: handle-only faders + page scroll in channel grid. */
  mobileTouchFaders?: boolean
}) {
  const activeUniverse = useTypedSelector((s) => s.mixer.activeUniverse)
  const showAllMixerChannels = useTypedSelector(
    (s) => s.mixer.showAllMixerChannels
  )
  const assignedIndices = useDmxSelector((dmx) =>
    buildAssignedChannelIndices(dmx, activeUniverse)
  )
  const dmxIndexes = useMemo(() => {
    if (showAllMixerChannels) {
      return Array.from({ length: DMX_NUM_CHANNELS }, (_, i) => i)
    }
    return assignedIndices
  }, [showAllMixerChannels, assignedIndices])
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [colsPerRow, setColsPerRow] = useState(1)

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (el === null) {
      return
    }
    const measure = () => {
      const first = el.firstElementChild
      if (!(first instanceof HTMLElement)) {
        return
      }
      const colW = first.offsetWidth
      if (colW <= 0) {
        return
      }
      const n = Math.max(1, Math.floor(el.clientWidth / colW))
      setColsPerRow((prev) => (prev !== n ? n : prev))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <Root>
      {!hideStatusBar ? <StatusBar /> : null}
      <Header />
      <LabelledSliderWrapper ref={wrapperRef}>
        {dmxIndexes.map((channelIndex, gridIndex) => (
          <LabelledSlider
            key={channelIndex}
            channelIndex={channelIndex}
            gridIndex={gridIndex}
            visibleChannels={dmxIndexes}
            colsPerRow={colsPerRow}
            mobileTouchFaders={mobileTouchFaders}
          />
        ))}
      </LabelledSliderWrapper>
    </Root>
  )
}

const Root = styled.div`
  height: 100%;
  min-height: 0;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const LabelledSliderWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0 1rem;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a33 #0000;
  -webkit-overflow-scrolling: touch;

  [data-remote-ui-mode='mobile'] & {
    margin: 0 0.65rem;
    touch-action: pan-y;
  }

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
  const showAllMixerChannels = _s.showAllMixerChannels
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
      <HeaderTitleRow>
        <PopupTitleRow>
          <HeaderTitle>DMX Out</HeaderTitle>
          <MixerHelpButton />
        </PopupTitleRow>
      </HeaderTitleRow>
      <HeaderToolbar>
        <UniverseCluster>
          <UniverseLabel>Universe</UniverseLabel>
          <BriefTooltip title="Previous universe">
            <span>
              <IconButton
                disabled={!canGoBack}
                onClick={() =>
                  dispatch(setActiveMixerUniverse(_s.activeUniverse - 1))
                }
              >
                <BackIcon />
              </IconButton>
            </span>
          </BriefTooltip>
          <BriefTooltip title="Universe shown in the mixer">
            <Page>{_s.activeUniverse}</Page>
          </BriefTooltip>
          <BriefTooltip title="Next universe">
            <span>
              <IconButton
                disabled={!canGoForward}
                onClick={() =>
                  dispatch(setActiveMixerUniverse(_s.activeUniverse + 1))
                }
              >
                <ForwardIcon />
              </IconButton>
            </span>
          </BriefTooltip>
        </UniverseCluster>
        <BriefTooltip title="Show all 512 channels or only patched fixture channels">
          <AllChannelsToggle
            control={
              <Switch
                size="small"
                checked={showAllMixerChannels}
                onChange={(_, checked) =>
                  dispatch(setMixerShowAllChannels(checked))
                }
                inputProps={{ 'aria-label': 'Show all DMX channels' }}
              />
            }
            label={<MixerToggleLabel>All channels</MixerToggleLabel>}
          />
        </BriefTooltip>
        <BriefTooltip title="Clear manual overrides on this universe">
          <span>
            <ResetOverwritesButton
              disabled={!hasOverwrites}
              variant="contained"
              size="small"
              onClick={() => dispatch(clearOverwrites(_s.activeUniverse))}
            >
              Reset
            </ResetOverwritesButton>
          </span>
        </BriefTooltip>
      </HeaderToolbar>
    </HeaderRoot>
  )
}

const MixerToggleLabel = styled.span`
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.text.secondary};
  user-select: none;
  white-space: nowrap;
`

const HeaderTitle = styled.div`
  font-size: 1.3rem;
`

const HeaderTitleRow = styled.div`
  display: flex;
  align-items: center;

  [data-remote-ui-mode='mobile'] & {
    display: none;
  }
`

const HeaderToolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  min-width: 0;

  [data-remote-ui-mode='mobile'] & {
    flex-wrap: nowrap;
    justify-content: space-between;
    width: 100%;
    gap: 0.35rem;
  }
`

const UniverseCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
`

const AllChannelsToggle = styled(FormControlLabel)`
  && {
    margin: 0;
    gap: 0.35rem;
    flex-shrink: 1;
    min-width: 0;
    align-items: center;
  }

  [data-remote-ui-mode='mobile'] & {
    && {
      flex: 1 1 auto;
      justify-content: center;
    }

    .MuiFormControlLabel-label {
      text-align: center;
    }
  }
`

const ResetOverwritesButton = styled(Button)`
  [data-remote-ui-mode='mobile'] & {
    min-width: 0;
    padding-left: 0.65rem;
    padding-right: 0.65rem;
    font-size: 0.82rem;
    flex-shrink: 0;
  }
`

const UniverseLabel = styled.div`
  font-size: 0.9rem;
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: nowrap;

  [data-remote-ui-mode='mobile'] & {
    display: none;
  }
`

const HeaderRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.65rem;
  margin-top: 1rem;
  margin-left: 1rem;
  margin-right: 1rem;
  margin-bottom: 1rem;
  min-width: 0;
  box-sizing: border-box;

  [data-remote-ui-mode='mobile'] & {
    margin-top: 0.65rem;
    margin-bottom: 0.65rem;
    gap: 0;
  }
`

const Page = styled.span`
  font-size: 1.1rem;
  min-width: 1.8rem;
  text-align: center;
`

function getColor(index: number | null) {
  if (index !== null) {
    const hue = (40 + index * 50) % 360
    return `hsla(${hue}, 100%, 30%, 0.5)`
  }
  return '#0000'
}

type Status_t = 'single' | 'begin' | 'mid' | 'end' | 'none'

function fixtureChannelName(channel: FixtureChannel | null): string {
  if (!channel) {
    return 'N/A'
  }
  if (channel.type === 'custom') {
    return channel.name
  }
  if (channel.type === 'axis') {
    const axis = axisDirName(channel.dir)
    return channel.isFine ? `${axis} Fine` : axis
  }
  if (channel.type === 'color') {
    return getCustomColorChannelName(channel.color)
  }
  if (channel.type === 'goboMap') {
    return 'Gobo Map'
  }
  if (channel.type === 'colorMap') {
    return 'Color Map'
  }
  if (channel.type === 'fxtrTrigger') {
    return channel.name
  }
  if (channel.type === 'fxtrLevel') {
    return channel.name
  }
  if (channel.type === 'master') {
    return 'Master'
  }
  if (channel.type === 'strobe') {
    return 'Strobe'
  }
  return 'Split'
}

const LabelledSlider = React.memo(function LabelledSlider({
  channelIndex,
  gridIndex,
  visibleChannels,
  colsPerRow,
  mobileTouchFaders = false,
}: {
  /** Absolute 0-based DMX channel index for this universe. */
  channelIndex: number
  /** Position in the wrapped mixer grid (0 .. visibleChannels.length-1). */
  gridIndex: number
  visibleChannels: readonly number[]
  colsPerRow: number
  mobileTouchFaders?: boolean
}) {
  const ch = channelIndex + 1
  const activeUniverse = useTypedSelector((state) => state.mixer.activeUniverse)
  const overwrite: number | undefined = useTypedSelector(
    (state) =>
      getUniverseOverwrites(state.mixer, state.mixer.activeUniverse)[channelIndex]
  )
  const {
    status,
    fixtureIndex,
    fixtureName,
    channelName,
    fixtureStartCh,
    fixtureEndCh,
  }: {
    status: Status_t
    fixtureIndex: number | null
    fixtureName: string
    channelName: string
    fixtureStartCh: number
    fixtureEndCh: number
  } = useDmxSelector(
    (state) => {
      let i = 0
      for (const f of state.universe) {
        if ((f.universe ?? 1) !== activeUniverse) {
          continue
        }

        const ft = state.fixtureTypesByID[f.type]
        const fixtureDisplayName =
          f.name?.trim().length
            ? f.name.trim()
            : ft.name
        const fixtureChannel = ft.channels[ch - f.ch] ?? null
        const channelDisplayName = fixtureChannelName(fixtureChannel)
        const endChannel = f.ch + ft.channels.length - 1
        if (ch == f.ch) {
          if (ch == endChannel) {
            return {
              status: 'single',
              fixtureIndex: i,
              fixtureName: fixtureDisplayName,
              channelName: channelDisplayName,
              fixtureStartCh: f.ch,
              fixtureEndCh: endChannel,
            }
          } else {
            return {
              status: 'begin',
              fixtureIndex: i,
              fixtureName: fixtureDisplayName,
              channelName: channelDisplayName,
              fixtureStartCh: f.ch,
              fixtureEndCh: endChannel,
            }
          }
        }
        if (ch == endChannel) {
          return {
            status: 'end',
            fixtureIndex: i,
            fixtureName: fixtureDisplayName,
            channelName: channelDisplayName,
            fixtureStartCh: f.ch,
            fixtureEndCh: endChannel,
          }
        }
        if (ch > f.ch && ch < endChannel) {
          return {
            status: 'mid',
            fixtureIndex: i,
            fixtureName: fixtureDisplayName,
            channelName: channelDisplayName,
            fixtureStartCh: f.ch,
            fixtureEndCh: endChannel,
          }
        }
        i += 1
      }
      return {
        status: 'none',
        fixtureIndex: null,
        fixtureName: '',
        channelName: 'N/A',
        fixtureStartCh: 0,
        fixtureEndCh: 0,
      }
    }
  )
  const output = useDmxMixerChannelOutput(activeUniverse, channelIndex)
  const sliderRadius = 0.5
  const dispatch = useDispatch()
  const { hoverDiv, isHover } = useHover()
  const isRemoteMobile = mobileTouchFaders || useRemoteMobileLayout()
  const trackRef = useRef<HTMLDivElement | null>(null)

  const onChange = (newVal: number) => {
    dispatch(
      setOverwrite({
        index: channelIndex,
        value: newVal,
        universe: activeUniverse,
      })
    )
  }

  const [, onTouchHandlePointerDown] = useDragMapped(
    ({ y }) => {
      onChange(y)
    },
    { containerRef: trackRef, axis: 'vertical', thresholdPx: 0 }
  )
  const touchHandleValue =
    overwrite !== undefined ? overwrite : output / 255

  const fixtureStartIndex = fixtureStartCh - 1
  const fixtureEndIndex = fixtureEndCh - 1
  const safeCols = Math.max(1, colsPerRow)
  const row = Math.floor(gridIndex / safeCols)
  const rowFirstGrid = row * safeCols
  const rowLastGrid = Math.min(
    rowFirstGrid + safeCols - 1,
    Math.max(0, visibleChannels.length - 1)
  )

  let rowSpan = 0
  let segStartCh = -1
  for (let g = rowFirstGrid; g <= rowLastGrid; g++) {
    const ci = visibleChannels[g]
    if (ci === undefined) continue
    if (ci >= fixtureStartIndex && ci <= fixtureEndIndex) {
      rowSpan++
      if (segStartCh < 0) {
        segStartCh = ci
      }
    }
  }

  const showRowFixtureLabel =
    status !== 'none' &&
    fixtureName.length > 0 &&
    rowSpan > 0 &&
    channelIndex === segStartCh &&
    channelIndex >= fixtureStartIndex &&
    channelIndex <= fixtureEndIndex

  return (
    <Col ref={hoverDiv}>
      <SliderRow>
        <ChannelName title={channelName}>{channelName}</ChannelName>
        <SliderWrap ref={isRemoteMobile ? trackRef : undefined}>
          {isRemoteMobile ? (
            <>
              <MobileFaderTrack $radius={sliderRadius} />
              <LiveDmxSliderCursor
                universe={activeUniverse}
                channelIndex={channelIndex}
                radius={sliderRadius}
                orientation="vertical"
                color={overwrite !== undefined ? '#b1b1ff' : undefined}
              />
              <MobileTouchHandle
                $radius={sliderRadius}
                $value={touchHandleValue}
                $active={overwrite !== undefined}
                onPointerDown={onTouchHandlePointerDown}
                title={`Channel ${ch} — drag handle to override`}
                aria-label={`Channel ${ch} level`}
              />
            </>
          ) : (
            <SliderBase
              radius={sliderRadius}
              onChange={onChange}
              orientation="vertical"
            >
              <LiveDmxSliderCursor
                universe={activeUniverse}
                channelIndex={channelIndex}
                radius={sliderRadius}
                orientation="vertical"
                color={overwrite !== undefined ? '#b1b1ff' : undefined}
              />
            </SliderBase>
          )}
        </SliderWrap>
      </SliderRow>
      <Div>
        <Status
          style={{
            ...statusStyles[status],
            backgroundColor: getColor(fixtureIndex),
          }}
        />
        {showRowFixtureLabel ? (
          <MixerFixtureRowLabel text={fixtureName} rowSpan={rowSpan} />
        ) : null}
        <ChannelLabel>{ch.toString()}</ChannelLabel>
      </Div>
      {isHover && (
        <InfoCursor
          output={output}
          fixtureName={fixtureName}
          fixtureChannelName={channelName}
        />
      )}
    </Col>
  )
})

const Col = styled.div`
  --mixer-col-width: 2.85rem;
  height: 14rem;
  width: var(--mixer-col-width);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-bottom: 1rem;

  [data-remote-ui-mode='mobile'] & {
    --mixer-col-width: 3.5rem;
    height: 17rem;
    margin-bottom: 1.25rem;
  }
`

const SliderRow = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  gap: 0.12rem;
`

const ChannelName = styled.div`
  width: 0.72rem;
  min-width: 0.72rem;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.6rem;
  letter-spacing: 0.02rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  user-select: none;
`

const SliderWrap = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 1.5rem;
  height: 100%;

  [data-remote-ui-mode='mobile'] & {
    touch-action: pan-y;
  }
`

const MobileFaderTrack = styled.div<{ $radius: number }>`
  position: absolute;
  top: ${(p) => p.$radius}rem;
  bottom: ${(p) => p.$radius}rem;
  left: 50%;
  width: ${(p) => p.$radius * 2}rem;
  transform: translateX(-50%);
  border-radius: ${(p) => p.$radius}rem;
  background: #0006;
  pointer-events: none;
`

const MobileTouchHandle = styled.div<{
  $radius: number
  $value: number
  $active: boolean
}>`
  position: absolute;
  left: 50%;
  width: max(2.35rem, ${(p) => p.$radius * 2 + 0.55}rem);
  height: max(1.15rem, 2.35rem);
  min-height: 2.35rem;
  bottom: ${(p) => p.$value * 100}%;
  transform: translate(-50%, 50%);
  border-radius: 0.28rem;
  border: 1px solid ${(p) => (p.$active ? '#c8c8ff' : '#8a8a8a')};
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(180deg, #ececff 0%, #b4b4e8 45%, #7575b0 100%)'
      : 'linear-gradient(180deg, #ececec 0%, #b4b4b4 45%, #757575 100%)'};
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 -2px 0 rgba(0, 0, 0, 0.22);
  z-index: 2;
  touch-action: none;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`

const Div = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
  margin-top: 0.5rem;
  padding-top: 0.15rem;
  padding-bottom: 0.1rem;
  height: 2rem;
  width: 100%;
  overflow: visible;
`

const FixtureGroupLabel = styled.div`
  position: absolute;
  left: 0.2rem;
  top: 0.14rem;
  height: 0.62rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #ddd;
  font-size: 0.52rem;
  line-height: 1;
  z-index: 1;
  pointer-events: none;
`

/** One row of a wrapped fixture group: fixture name across merged column width (scroll if long). */
function MixerFixtureRowLabel({ text, rowSpan }: { text: string; rowSpan: number }) {
  const widthStyle = {
    width: `calc(var(--mixer-col-width) * ${Math.max(1, rowSpan)} - 0.4rem)`,
  } as const

  return (
    <FixtureGroupLabel title={text} style={widthStyle}>
      <AutoScrollText text={text} />
    </FixtureGroupLabel>
  )
}

const ChannelLabel = styled.div`
  color: #ddd;
  font-size: 0.72rem;
  line-height: 1;
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

function InfoCursor({
  output,
  fixtureName,
  fixtureChannelName,
}: {
  output: number
  fixtureName: string
  fixtureChannelName: string
}) {
  const pos = useMousePosition()

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

function AutoScrollText({ text }: { text: string }) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const tickerRef = useRef<HTMLDivElement | null>(null)
  const [overflowPx, setOverflowPx] = useState(0)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const ticker = tickerRef.current
    if (viewport === null || ticker === null) return

    const measure = () => {
      const nextOverflow = Math.max(0, ticker.scrollWidth - viewport.clientWidth)
      setOverflowPx((current) =>
        Math.abs(current - nextOverflow) > 0.5 ? nextOverflow : current
      )
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(ticker)
    return () => observer.disconnect()
  }, [text])

  useEffect(() => {
    const ticker = tickerRef.current
    if (ticker === null || overflowPx <= 1) return
    const durationMs = Math.max(4000, Math.round(overflowPx * 60 + 2800))
    const animation = ticker.animate(
      [
        { transform: 'translateX(0px)', offset: 0 },
        { transform: 'translateX(0px)', offset: 0.18 },
        { transform: `translateX(-${overflowPx}px)`, offset: 0.5 },
        { transform: `translateX(-${overflowPx}px)`, offset: 0.82 },
        { transform: 'translateX(0px)', offset: 1 },
      ],
      {
        duration: durationMs,
        easing: 'ease-in-out',
        iterations: Infinity,
      }
    )
    return () => animation.cancel()
  }, [overflowPx, text])

  return (
    <div
      ref={viewportRef}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        ref={tickerRef}
        style={{
          display: 'inline-block',
          padding: '0 0.08rem',
          willChange: overflowPx > 1 ? 'transform' : 'auto',
        }}
      >
        {text}
      </div>
    </div>
  )
}

