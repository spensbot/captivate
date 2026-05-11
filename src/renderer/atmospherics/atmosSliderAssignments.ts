import {
  AtmosFxtrDesc,
  AtmosSettings,
} from '../../shared/atmospherics'

export interface AtmosSliderAssignmentSummary {
  labelsBySlider: Partial<Record<string, string>>
  activeSliders: Set<string>
}

/** Which atmospherics sliders are linked (stub until wiring is added). */
export function sumAtmosSliders(
  _settings: AtmosSettings,
  _fixtures: AtmosFxtrDesc[]
): AtmosSliderAssignmentSummary {
  return {
    labelsBySlider: {},
    activeSliders: new Set<string>(),
  }
}
