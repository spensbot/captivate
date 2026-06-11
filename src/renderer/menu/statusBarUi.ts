import styled, { css } from 'styled-components'
import type { SxProps, Theme } from '@mui/material/styles'

/** Three connection rows + gaps — target height for all status bar controls. */
export const STATUS_BAR_CONTROL_HEIGHT = '2.5rem'

/** Default spacing in the transport cluster (play / tap / BPM / beat meter). */
export const STATUS_BAR_TRANSPORT_GAP = '0.7rem'

/** Extra margin beside TAP (+150% of transport gap → 1.75rem total to neighbors). */
export const STATUS_BAR_TAP_SIDE_MARGIN = '1.05rem'

const statusBarInnerControlHeight = `calc(${STATUS_BAR_CONTROL_HEIGHT} - 0.3rem)`
const statusBarFieldHeight = `calc(${STATUS_BAR_CONTROL_HEIGHT} - 0.2rem)`

export const statusBarMuiIconButtonSx: SxProps<Theme> = {
  color: 'text.secondary',
  width: STATUS_BAR_CONTROL_HEIGHT,
  height: STATUS_BAR_CONTROL_HEIGHT,
  borderRadius: '0.35rem',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.default',
  flexShrink: 0,
  '& .MuiSvgIcon-root': {
    fontSize: '1.35rem',
  },
  '&:hover': {
    bgcolor: 'action.hover',
    borderColor: 'text.disabled',
    color: 'text.primary',
  },
}

export const StatusBarCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
`

/** Wider spacing between play, tap, BPM, and beat meter. */
export const StatusBarTransportCluster = styled(StatusBarCluster)`
  gap: ${STATUS_BAR_TRANSPORT_GAP};
`

export const StatusBarControlShell = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: ${STATUS_BAR_CONTROL_HEIGHT};
  padding: 0 0.4rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(p) => p.theme.colors.bg.darker};
  box-shadow: ${(p) => p.theme.elevation.insetHighlight};
  min-width: 0;
`

export const StatusBarLabel = styled.span`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${(p) => p.theme.colors.text.secondary};
  user-select: none;
  flex: 0 0 auto;
`

const interactiveControlBase = css`
  font: inherit;
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    box-shadow 120ms ease;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

export const StatusBarTextButton = styled.button`
  ${interactiveControlBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: ${STATUS_BAR_CONTROL_HEIGHT};
  padding: 0 0.65rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(p) => p.theme.colors.bg.darker};
  box-shadow: ${(p) => p.theme.elevation.insetHighlight};
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  user-select: none;

  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.bg.panel};
    border-color: ${(p) => p.theme.colors.text.secondary};
  }

  &:active:not(:disabled) {
    background: ${(p) => p.theme.colors.bg.raised};
    box-shadow: ${(p) => p.theme.elevation.insetDepth};
  }
`

export const StatusBarPlayStopButton = styled.button<{ $playing: boolean }>`
  ${interactiveControlBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${STATUS_BAR_CONTROL_HEIGHT};
  height: ${STATUS_BAR_CONTROL_HEIGHT};
  padding: 0;
  border-radius: 999px;
  border: 1px solid
    ${(p) => (p.$playing ? 'rgba(120, 220, 130, 0.75)' : p.theme.colors.divider)};
  background: ${(p) =>
    p.$playing
      ? 'linear-gradient(180deg, rgba(120, 220, 130, 0.42), rgba(70, 140, 80, 0.28))'
      : `linear-gradient(180deg, ${p.theme.colors.bg.raised}, ${p.theme.colors.bg.darker})`};
  box-shadow: ${(p) => p.theme.elevation.insetHighlight};
  color: ${(p) => p.theme.colors.text.primary};
  flex: 0 0 auto;

  svg {
    font-size: 1.45rem;
  }

  &:hover {
    border-color: ${(p) =>
      p.$playing ? 'rgba(150, 240, 160, 0.9)' : p.theme.colors.text.secondary};
    background: ${(p) =>
      p.$playing
        ? 'linear-gradient(180deg, rgba(130, 230, 140, 0.52), rgba(80, 150, 90, 0.34))'
        : p.theme.colors.bg.panel};
  }

  &:active {
    box-shadow: ${(p) => p.theme.elevation.insetDepth};
  }
`

export const StatusBarReadout = styled.div`
  cursor: nesw-resize;
  user-select: none;
  min-width: 2.85rem;
  text-align: center;
  font-size: 1.28rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${(p) => p.theme.colors.text.primary};
  line-height: 1;
`

export const StatusBarFieldInput = styled.input`
  width: 3.45rem;
  height: ${statusBarFieldHeight};
  background: ${(p) => p.theme.colors.bg.primary};
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.28rem;
  color: ${(p) => p.theme.colors.text.primary};
  padding: 0 0.35rem;
  text-align: center;
  font-size: 1.28rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  box-shadow: ${(p) => p.theme.elevation.insetDepth};

  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.colors.text.secondary};
  }
`

export const StatusBarBpmRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  flex: 0 0 auto;
`

export const StatusBarStepButton = styled.button`
  ${interactiveControlBase}
  width: ${statusBarInnerControlHeight};
  height: ${statusBarInnerControlHeight};
  line-height: 1;
  padding: 0;
  border-radius: 0.28rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.panel};
  color: ${(p) => p.theme.colors.text.secondary};
  font-size: 1rem;
  font-weight: 700;

  &:hover:not(:disabled) {
    color: ${(p) => p.theme.colors.text.primary};
    border-color: ${(p) => p.theme.colors.text.secondary};
    background: ${(p) => p.theme.colors.bg.raised};
  }
`

/** Beat meter width (+75% from the prior 9.375rem gauge). */
export const STATUS_BAR_BEAT_METER_WIDTH = '16.40625rem'

/** Audio input level meter in the top bar (+50% from the prior 4.5rem track). */
export const STATUS_BAR_AUDIO_METER_WIDTH = '6.75rem'

export const StatusBarTapButton = styled.button`
  ${interactiveControlBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.25rem;
  height: ${STATUS_BAR_CONTROL_HEIGHT};
  margin-left: ${STATUS_BAR_TAP_SIDE_MARGIN};
  margin-right: ${STATUS_BAR_TAP_SIDE_MARGIN};
  padding: 0 1.25rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.45rem;
  background: linear-gradient(
    180deg,
    rgba(210, 210, 210, 0.72),
    rgba(110, 110, 110, 0.55)
  );
  box-shadow: ${(p) => p.theme.elevation.insetHighlight};
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${(p) => p.theme.colors.text.primary};
  flex: 0 0 auto;

  &:hover:not(:disabled) {
    background: linear-gradient(
      180deg,
      rgba(230, 230, 230, 0.78),
      rgba(130, 130, 130, 0.58)
    );
    border-color: ${(p) => p.theme.colors.text.secondary};
  }

  &:active:not(:disabled) {
    background: linear-gradient(
      180deg,
      rgba(160, 160, 160, 0.62),
      rgba(80, 80, 80, 0.52)
    );
    box-shadow: ${(p) => p.theme.elevation.insetDepth};
  }
`

/** Inline meter bars (e.g. audio level) sized to the status bar control row. */
export const STATUS_BAR_INLINE_METER_HEIGHT = `calc(${STATUS_BAR_CONTROL_HEIGHT} - 1rem)`

export const StatusBarMeterTrack = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: ${STATUS_BAR_BEAT_METER_WIDTH};
  height: ${STATUS_BAR_INLINE_METER_HEIGHT};
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg.darker};
  box-shadow: ${(p) => p.theme.elevation.insetDepth};
  flex: 0 0 auto;
`

export const StatusBarMeterSegment = styled.div<{ $active: number }>`
  flex: 1 0 0;
  align-self: stretch;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98),
    rgba(210, 210, 210, 0.9)
  );
  opacity: ${(p) => Math.min(1, Math.max(0, p.$active))};

  & + & {
    border-left: 1px solid ${(p) => p.theme.colors.bg.darker};
  }
`

export const StatusBarConnectionRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.05rem 0.15rem;
  font-size: 0.68rem;
  line-height: 1;
  gap: 0.35rem;
`

export const StatusBarConnectionLabel = styled.span`
  color: ${(p) => p.theme.colors.text.secondary};
  letter-spacing: 0.03em;
  text-transform: lowercase;
`

export const StatusBarStatusDot = styled.div<{ $color: string }>`
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 0.12rem;
  background-color: ${(p) => p.$color};
  box-shadow: 0 0 0 1px ${(p) => p.theme.colors.bg.darker};
  flex-shrink: 0;
`
