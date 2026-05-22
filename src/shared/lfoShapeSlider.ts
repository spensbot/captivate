/** Matches ModulatorControl `VerticalSlider` thumb (0.56rem outer box). */
export const LFO_SHAPE_SLIDER_THUMB_RADIUS_REM = 0.28
export const LFO_SHAPE_SLIDER_THUMB_DIAMETER_REM =
  LFO_SHAPE_SLIDER_THUMB_RADIUS_REM * 2
/** Matches `VerticalSlider` runnable track thickness. */
export const LFO_SHAPE_SLIDER_TRACK_WIDTH_REM = 0.24

/** Audio-band “Max Level” slider ceiling in the modulator panel. */
export const AUDIO_BAND_MAX_LEVEL_UI = 0.65

export function clampSliderValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

/** 0 = bottom of travel, 1 = top — same linear range as `<input type="range">`. */
export function sliderValueToThumbNorm(
  value: number,
  min: number,
  max: number
): number {
  const clamped = clampSliderValue(value, min, max)
  if (max <= min) {
    return 0.5
  }
  return (clamped - min) / (max - min)
}
