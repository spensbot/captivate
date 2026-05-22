import styled from 'styled-components'
import {
  LASER_EDITOR_PARAMS_MAX_WIDTH_REM,
  LASER_EDITOR_PARAMS_MIN_WIDTH_REM,
  LASER_EDITOR_PARAMS_PREFERRED_WIDTH_REM,
} from './laserLayoutConstants'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SliderBase from '../base/SliderBase'
import SliderCursor from '../base/SliderCursor'
import type { LaserShapeLayer } from './laserEditorTypes'

const SLIDER_RADIUS = 0.32

type Props = {
  /** Samples used for laser output (manual or split-linked). */
  laserDotSamples: number
  dotDensityLocked: boolean
  onManualDotSamples: (v: number) => void
  /** Phase 0–1 used for laser scan path. */
  laserScanPhase01: number
  scanPathLocked: boolean
  onScanPathPhase01: (v: number) => void
  animPlaying: boolean
  onAnimPlayingToggle: () => void
  animSpeed: number
  onAnimSpeed: (v: number) => void
  effectiveAnimSpeed: number
  playbackSpeedLocked: boolean
  /** True when the active scene has at least one gradient/rainbow beam layer. */
  hasBeamAnimatedLayers: boolean
  /** 0–1 progress driving beam phase and preset motion (when using sky presets). */
  animationProgressEffective: number
  /** When true, progress slider is read-only (split-linked or while playback is running). */
  animationProgressSliderLocked: boolean
  onAnimationProgress: (v: number) => void
  selectedLayer: LaserShapeLayer | null
  textDraft: string
  onTextDraft: (v: string) => void
  textFontFamily: string
  onTextFontFamily: (v: string) => void
}

const FONT_OPTIONS = [
  { id: 'system-ui, sans-serif', label: 'System UI' },
  { id: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { id: 'Georgia, serif', label: 'Georgia' },
  { id: '"Courier New", monospace', label: 'Courier' },
  { id: '"Times New Roman", Times, serif', label: 'Times' },
  { id: 'Verdana, sans-serif', label: 'Verdana' },
] as const

export default function LaserEditorParametersPanel({
  laserDotSamples,
  dotDensityLocked,
  onManualDotSamples,
  laserScanPhase01,
  scanPathLocked,
  onScanPathPhase01,
  animPlaying,
  onAnimPlayingToggle,
  animSpeed,
  onAnimSpeed,
  effectiveAnimSpeed,
  playbackSpeedLocked,
  hasBeamAnimatedLayers,
  animationProgressEffective,
  animationProgressSliderLocked,
  onAnimationProgress,
  selectedLayer,
  textDraft,
  onTextDraft,
  textFontFamily,
  onTextFontFamily,
}: Props) {
  const normSamples = (laserDotSamples - 32) / (480 - 32)
  const isText = selectedLayer?.kind === 'text'
  const normAnimProgress = animationProgressEffective

  return (
    <Root>
      <PanelTitle>Editor parameters</PanelTitle>
      <Scroll>
        <Block>
          <BlockTitle>
            Point density
            {dotDensityLocked ? ' (linked)' : ' (manual)'}
          </BlockTitle>
          <Muted>More samples = smoother laser lines (canvas and DAC output).</Muted>
          <SliderRow
            style={{
              opacity: dotDensityLocked ? 0.55 : 1,
              pointerEvents: dotDensityLocked ? 'none' : 'auto',
            }}
          >
            <SliderBase
              orientation="vertical"
              radius={SLIDER_RADIUS}
              verticalPadRem={0.1}
              title="Samples along path"
              ariaLabel="Samples along path"
              onChange={(n) =>
                onManualDotSamples(
                  Math.round(32 + Math.max(0, Math.min(1, n)) * (480 - 32))
                )
              }
            >
              <SliderCursor
                orientation="vertical"
                value={normSamples}
                radius={SLIDER_RADIUS}
                color="#ffd896"
              />
            </SliderBase>
            <SliderMeta>
              <Value>{Math.round(laserDotSamples)}</Value>
              <UnitLabel>samples</UnitLabel>
            </SliderMeta>
          </SliderRow>
        </Block>

        <Block>
          <BlockTitle>
            Scan path phase
            {scanPathLocked ? ' (linked)' : ' (manual)'}
          </BlockTitle>
          <Muted>
            Shifts how rainbow or gradient colors sit along each stroked path (combined with
            playback time).
          </Muted>
          <SliderRow
            style={{
              opacity: scanPathLocked ? 0.55 : 1,
              pointerEvents: scanPathLocked ? 'none' : 'auto',
            }}
          >
            <SliderBase
              orientation="vertical"
              radius={SLIDER_RADIUS}
              verticalPadRem={0.1}
              title="Path phase"
              ariaLabel="Path phase"
              onChange={onScanPathPhase01}
            >
              <SliderCursor
                orientation="vertical"
                value={laserScanPhase01}
                radius={SLIDER_RADIUS}
                color="#ffd896"
              />
            </SliderBase>
            <SliderMeta>
              <Value>{Math.round(laserScanPhase01 * 100)}</Value>
              <UnitLabel>% phase</UnitLabel>
            </SliderMeta>
          </SliderRow>
        </Block>

        <Block>
          <BlockTitle>Animation progress</BlockTitle>
          <Muted>
            Slides preset shapes across the canvas (waves, saw teeth, etc.) and beam
            color phase. Pause playback to drag manually, or link to the group split.
          </Muted>
          <SliderRow
            style={{
              opacity: animationProgressSliderLocked ? 0.55 : 1,
              pointerEvents: animationProgressSliderLocked ? 'none' : 'auto',
            }}
          >
            <SliderBase
              orientation="vertical"
              radius={SLIDER_RADIUS}
              verticalPadRem={0.1}
              title="Animation progress"
              ariaLabel="Animation progress"
              onChange={(n) =>
                onAnimationProgress(Math.max(0, Math.min(1, n)))
              }
            >
              <SliderCursor
                orientation="vertical"
                value={normAnimProgress}
                radius={SLIDER_RADIUS}
                color="#9bdcff"
              />
            </SliderBase>
            <SliderMeta>
              <Value>{Math.round(animationProgressEffective * 100)}</Value>
              <UnitLabel>%</UnitLabel>
            </SliderMeta>
          </SliderRow>
        </Block>

        <Block>
          <BlockTitle>Animation playback</BlockTitle>
          <Muted>
            Play advances progress (manual mode) so beam effects and DAC output update.
            Solid beam color does not change.
          </Muted>
          {!hasBeamAnimatedLayers ? (
            <Muted style={{ marginTop: '-0.12rem' }}>
              Gradient or rainbow beams need the beam buttons on the canvas toolbar.
            </Muted>
          ) : null}
          <AnimRow>
            <AnimPlayButton
              type="button"
              onClick={onAnimPlayingToggle}
              title={animPlaying ? 'Pause' : 'Play'}
              aria-label={animPlaying ? 'Pause laser animation' : 'Play laser animation'}
            >
              {animPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </AnimPlayButton>
            <AnimSpeedWrap>
              <FieldLabel style={{ margin: 0 }}>
                Speed {playbackSpeedLocked ? '(linked)' : '(manual)'}
              </FieldLabel>
              <AnimSpeed
                type="range"
                min={0.2}
                max={3}
                step={0.05}
                value={animSpeed}
                disabled={playbackSpeedLocked}
                onChange={(e) => onAnimSpeed(Number(e.target.value) || 1)}
              />
              <AnimSpeedVal>
                {effectiveAnimSpeed.toFixed(2)}×
                {playbackSpeedLocked ? ' · split / LFO' : ''}
              </AnimSpeedVal>
            </AnimSpeedWrap>
          </AnimRow>
        </Block>

        {isText ? (
          <Block>
            <BlockTitle>Text layer</BlockTitle>
            <FieldLabel>Content</FieldLabel>
            <TextArea
              rows={3}
              value={textDraft}
              onChange={(e) => onTextDraft(e.target.value)}
              placeholder="Label on canvas"
            />
            <FieldLabel>Font</FieldLabel>
            <Select
              value={textFontFamily}
              onChange={(e) => onTextFontFamily(e.target.value)}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Block>
        ) : null}
      </Scroll>
    </Root>
  )
}

const Root = styled.div`
  flex: 0 1 ${LASER_EDITOR_PARAMS_PREFERRED_WIDTH_REM}rem;
  width: ${LASER_EDITOR_PARAMS_PREFERRED_WIDTH_REM}rem;
  max-width: min(${LASER_EDITOR_PARAMS_MAX_WIDTH_REM}rem, 38vw);
  min-width: ${LASER_EDITOR_PARAMS_MIN_WIDTH_REM}rem;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  display: flex;
  flex-direction: column;
`

const PanelTitle = styled.div`
  flex-shrink: 0;
  padding: 0.42rem 0.5rem;
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
  font-size: 0.74rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

const Scroll = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0.45rem 0.48rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`

const Block = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(p) => p.theme.colors.bg.darker};
  padding: 0.4rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
`

const BlockTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

const Muted = styled.div`
  font-size: 0.62rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
`

const SliderRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.45rem;
  height: 7.5rem;
  min-height: 7.5rem;
`

const AnimRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.45rem;
  margin-top: 0.12rem;
`

const AnimPlayButton = styled.button`
  flex: 0 0 auto;
  width: 2.4rem;
  height: 2.4rem;
  align-self: center;
  border-radius: 0.35rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const AnimSpeedWrap = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
  justify-content: center;
`

const AnimSpeed = styled.input`
  width: 100%;
`

const AnimSpeedVal = styled.div`
  font-size: 0.62rem;
  color: ${(p) => p.theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const SliderMeta = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 0.15rem;
  gap: 0.08rem;
`

const Value = styled.div`
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${(p) => p.theme.colors.text.primary};
`

const UnitLabel = styled.div`
  font-size: 0.6rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const FieldLabel = styled.label`
  font-size: 0.64rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.28rem 0.34rem;
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  font-size: 0.68rem;
  resize: vertical;
  min-height: 3.2rem;
`

const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.26rem 0.32rem;
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  font-size: 0.68rem;
`
