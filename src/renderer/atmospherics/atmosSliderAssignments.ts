import {
  AtmosphericsDmxFixtureDescriptor,
  AtmosphericsSettings,
} from '../../shared/atmospherics'

export interface AtmosSliderAssignmentSummary {
  labelsBySlider: Partial<Record<string, string>>
  activeSliders: Set<string>
}

/** Which atmospherics sliders are linked (stub until wiring is added). */
export function sumAtmosSliders(
  _settings: AtmosphericsSettings,
  _fixtures: AtmosphericsDmxFixtureDescriptor[]
): AtmosSliderAssignmentSummary {
  return {
    labelsBySlider: {},
    activeSliders: new Set<string>(),
  }
}
