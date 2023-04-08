import { channelConfig } from 'features/dmx/channel.config'
import { FixtureChannel } from 'features/dmx/shared/dmxFixtures'


export interface QlcChannel {
  // Name and Preset are XML attributes, so they need to be prefixed with something
  '@_Name': string
  '@_Preset'?: Preset
  Group?: null
  Capability?: null
}

// This is the heavy-hitter that converts the QlcChannel into a Captivate FixtureChannel
export function convert_qlc_channel(ch: QlcChannel): FixtureChannel {
  let preset = ch['@_Preset'] ?? ''
  let name = ch['@_Name']

  if (typeof preset !== 'string') {
    console.log(ch)
  }

  if (preset === 'Custom') {
    return channelConfig.custom.default()
  }
  if (preset.includes('Intensity')) {
    if (preset.includes('Fine')) {
      return channelConfig.custom.default({ name })
    } else if (preset.includes('Dimmer')) {
      return channelConfig.master.default()
    } else {
      const tail = preset.slice(9)
      if (tail === 'White')
        return channelConfig.color.default({ hue: 0, saturation: 0 })
      const hue = get_hue(tail)
      if (hue !== null) {
        return channelConfig.color.default({ hue, saturation: 1 })
      }
    }
  }
  if (preset.includes('Position')) {
    const dir = preset.includes('Pan') || preset.includes('XAxis') ? 'x' : 'y'
    const isFine = preset.includes('Fine')
    return channelConfig.axis.default({ dir, isFine })
  }
  if (ch['@_Preset'] === 'ShutterStrobeSlowFast')
    return channelConfig.strobe.default()
  if (ch['@_Preset'] === 'ShutterStrobeFastSlow') {
    return channelConfig.strobe.default({ invert: true })
  }
  if (ch['@_Preset'] === 'ColorMacro') {
    // TODO: Actually read color map colors
    return channelConfig.colorMap.default()
  }

  return channelConfig.custom.default({ name })
}

export function get_hue(color: string): number | null {
  if (color === 'Red') return 0
  if (color === 'Green') return 0.33
  if (color === 'Blue') return 0.66
  if (color === 'Cyan') return 0.5
  if (color === 'Magenta') return 0.833
  if (color === 'Yellow') return 0.166
  if (color === 'Amber') return 0.12
  if (color === 'Indigo') return 0.76
  if (color === 'Lime') return 0.33
  return null
}

type Preset =
  | 'Custom'
  | 'IntensityMasterDimmer'
  | 'IntensityMasterDimmerFine'
  | 'IntensityDimmer'
  | 'IntensityDimmerFine'
  | 'IntensityRed'
  | 'IntensityRedFine'
  | 'IntensityGreen'
  | 'IntensityGreenFine'
  | 'IntensityBlue'
  | 'IntensityBlueFine'
  | 'IntensityCyan'
  | 'IntensityCyanFine'
  | 'IntensityMagenta'
  | 'IntensityMagentaFine'
  | 'IntensityYellow'
  | 'IntensityYellowFine'
  | 'IntensityAmber'
  | 'IntensityAmberFine'
  | 'IntensityWhite'
  | 'IntensityWhiteFine'
  | 'IntensityUV'
  | 'IntensityUVFine'
  | 'IntensityIndigo'
  | 'IntensityIndigoFine'
  | 'IntensityLime'
  | 'IntensityLimeFine'
  | 'IntensityHue'
  | 'IntensityHueFine'
  | 'IntensitySaturation'
  | 'IntensitySaturationFine'
  | 'IntensityLightness'
  | 'IntensityLightnessFine'
  | 'IntensityValue'
  | 'IntensityValueFine'
  | 'PositionPan'
  | 'PositionPanFine'
  | 'PositionTilt'
  | 'PositionTiltFine'
  | 'PositionXAxis'
  | 'PositionYAxis'
  | 'SpeedPanSlowFast'
  | 'SpeedPanFastSlow'
  | 'SpeedTiltSlowFast'
  | 'SpeedTiltFastSlow'
  | 'SpeedPanTiltSlowFast'
  | 'SpeedPanTiltFastSlow'
  | 'ColorMacro'
  | 'ColorWheel'
  | 'ColorWheelFine'
  | 'ColorRGBMixer'
  | 'ColorCTOMixer'
  | 'ColorCTCMixer'
  | 'ColorCTBMixer'
  | 'GoboWheel'
  | 'GoboWheelFine'
  | 'GoboIndex'
  | 'GoboIndexFine'
  | 'ShutterStrobeSlowFast'
  | 'ShutterStrobeFastSlow'
  | 'ShutterIrisMinToMax'
  | 'ShutterIrisMaxToMin'
  | 'ShutterIrisFine'
  | 'BeamFocusNearFar'
  | 'BeamFocusFarNear'
  | 'BeamFocusFine'
  | 'BeamZoomSmallBig'
  | 'BeamZoomBigSmall'
  | 'BeamZoomFine'
  | 'PrismRotationSlowFast'
  | 'PrismRotationFastSlow'
  | 'NoFunction'
  | 'LastPreset' // dummy for cycles
