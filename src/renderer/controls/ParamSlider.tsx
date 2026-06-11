import { auxColorParamTrackGradient } from '../../shared/dmxColors'
import { DefaultParam, paramDisplayName } from '../../shared/params'
import SliderBase from '../base/SliderBase'
import { useBaseParam } from '../redux/store'
import { useDispatch } from 'react-redux'
import { deleteBaseParams, setBaseParams } from '../redux/controlSlice'
import LiveSliderCursor from './LiveSliderCursor'
import ManualSliderCursor from './ManualSliderCursor'
import { SliderMidiOverlay } from '../base/MidiOverlay'
import { makeSetBaseParamAction } from '../redux/deviceState'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled from 'styled-components'

interface Props {
  param: DefaultParam | string
  splitIndex: number
  hideRemoveButton?: boolean
  label?: string
  wrapperStyle?: CSSProperties
  manualCursorColor?: string
  liveCursorColor?: string
}

export default function ParamSlider({
  param,
  splitIndex,
  hideRemoveButton = false,
  label,
  wrapperStyle,
  manualCursorColor = '#fff',
  liveCursorColor,
}: Props) {
  const radius = 0.4

  const value = useBaseParam(param, splitIndex)
  const dispatch = useDispatch()
  const onChange = (newVal: number) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          [param]: newVal,
        },
      })
    )
  }
  const onRemove = () => {
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: [param],
      })
    )
  }

  if (value === undefined) return null
  const sliderLabel = label ?? paramDisplayName(param)
  const trackBackground = auxColorParamTrackGradient(param)

  const content = (
    <>
      {!hideRemoveButton ? (
        <CornerRemoveButton
          type="button"
          title={`Remove ${sliderLabel}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
        >
          x
        </CornerRemoveButton>
      ) : null}
      <VerticalSplitLabel text={sliderLabel} />
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          alignSelf: 'stretch',
          paddingTop: 0,
          boxSizing: 'border-box',
        }}
      >
        <SliderBase
          orientation="vertical"
          radius={radius}
          verticalPadRem={0.1}
          trackBackground={trackBackground}
          onChange={onChange}
        >
          <LiveSliderCursor
            orientation="vertical"
            param={param}
            radius={radius}
            splitIndex={splitIndex}
            color={liveCursorColor}
          />
          <ManualSliderCursor
            orientation="vertical"
            param={param}
            splitIndex={splitIndex}
            value={value}
            radius={radius}
            color={manualCursorColor}
            border
          />
        </SliderBase>
      </div>
    </>
  )

const defaultWrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '12rem',
    minHeight: '12rem',
    marginRight: '1rem',
    position: 'relative',
    paddingLeft: '1.25rem',
    boxSizing: 'border-box',
  }

  const mergedWrapperStyle: CSSProperties = {
    ...defaultWrapperStyle,
    ...wrapperStyle,
  }

  return (
    <SliderMidiOverlay
      action={makeSetBaseParamAction(splitIndex, param)}
      style={mergedWrapperStyle}
    >
      {content}
    </SliderMidiOverlay>
  )
}

const CornerRemoveButton = styled.button`
  position: absolute;
  top: -0.42rem;
  right: calc(-0.72rem - 10px);
  z-index: 6;
  width: 1rem;
  height: 1rem;
  line-height: 0.86rem;
  border-radius: 999px;
  border: 1px solid #ffffff44;
  background: #101521f0;
  color: #cfd5e4;
  font-size: 0.62rem;
  cursor: pointer;
  padding: 0;
  margin: 0;

  :hover {
    color: #fff;
    border-color: #ffffff77;
  }
`

function VerticalSplitLabel({ text }: { text: string }) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const tickerRef = useRef<HTMLDivElement | null>(null)
  const [overflowPx, setOverflowPx] = useState(0)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const ticker = tickerRef.current
    if (viewport === null || ticker === null) {
      return
    }

    const measure = () => {
      const visibleHeight = Math.max(0, viewport.clientHeight)
      const requiredLength = Math.max(0, ticker.scrollWidth)
      const nextOverflow = Math.max(0, requiredLength - visibleHeight + 4)
      setOverflowPx((current) =>
        Math.abs(current - nextOverflow) > 0.5 ? nextOverflow : current
      )
    }

    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(ticker)
    return () => observer.disconnect()
  }, [text])

  useEffect(() => {
    const ticker = tickerRef.current
    if (ticker === null || overflowPx <= 1) {
      return
    }

    const durationMs = Math.max(5000, Math.round(overflowPx * 90 + 4000))
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
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '1.05rem',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      title={text}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) rotate(-90deg)',
          transformOrigin: 'center center',
        }}
      >
        <div
          ref={tickerRef}
          style={{
            whiteSpace: 'nowrap',
            fontSize: '0.66rem',
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '0.015em',
            color: '#eef4ff',
            textShadow: '0 0 0.3rem #000b',
            willChange: overflowPx > 1 ? 'transform' : 'auto',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  )
}

