import { parseImperialLengthToDecimalFeet } from './imperialLength'
import { parseMetricLengthToMeters } from './metricLength'
import { FEET_PER_METER, METERS_PER_FOOT, type StageUnit } from './stage'

/** Normalize typographic quotes and unit spacing for parsers. */
export function normalizeLengthInputString(raw: string): string {
  return raw
    .trim()
    .replace(/′/g, "'")
    .replace(/″/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
}

function hasExplicitMetricUnit(s: string): boolean {
  if (/(?:mm|cm|millimeters?|millimetres?|centimeters?|centimetres?)/i.test(s)) {
    return true
  }
  if (
    /(-?\d+(?:\.\d+)?)\s+m(?:eters?|etres?)?(?:\s|$)/i.test(s) ||
    /(-?\d+(?:\.\d+)?)\s+m\b/i.test(s)
  ) {
    return true
  }
  if (/(-?\d+(?:\.\d+)?)(?:mm|cm|m)$/i.test(s.replace(/\s+/g, ''))) {
    return true
  }
  return false
}

function hasExplicitImperialUnit(s: string): boolean {
  if (/['"]/.test(s)) {
    return true
  }
  if (
    /(?:^|\s|\d)(?:ft|feet|foot|in|inch|inches)\b/i.test(s) ||
    /(-?\d+(?:\.\d+)?)\s*f\b/i.test(s)
  ) {
    return true
  }
  if (/(-?\d+(?:\.\d+)?)(?:ft|in|['"])$/i.test(s.replace(/\s+/g, ''))) {
    return true
  }
  return false
}

function metersToDisplayUnit(meters: number, displayUnit: StageUnit): number {
  return displayUnit === 'ft' ? meters * FEET_PER_METER : meters
}

function feetToDisplayUnit(feet: number, displayUnit: StageUnit): number {
  return displayUnit === 'ft' ? feet : feet * METERS_PER_FOOT
}

/**
 * Parse a length string in metric or imperial form and return the value in the
 * user's preferred display unit (`stageUnit`: decimal feet or meters).
 */
export function parseStageLengthInput(
  raw: string,
  displayUnit: StageUnit
): number | null {
  const s = normalizeLengthInputString(raw)
  if (s.length === 0) {
    return null
  }

  const metricExplicit = hasExplicitMetricUnit(s)
  const imperialExplicit = hasExplicitImperialUnit(s)

  if (metricExplicit && imperialExplicit) {
    return null
  }

  if (metricExplicit) {
    const meters = parseMetricLengthToMeters(s)
    if (meters === null) {
      return null
    }
    return metersToDisplayUnit(meters, displayUnit)
  }

  if (imperialExplicit) {
    const feet = parseImperialLengthToDecimalFeet(s)
    if (feet === null) {
      return null
    }
    return feetToDisplayUnit(feet, displayUnit)
  }

  if (displayUnit === 'ft') {
    const feet = parseImperialLengthToDecimalFeet(s)
    if (feet !== null) {
      return feet
    }
    const meters = parseMetricLengthToMeters(s)
    if (meters !== null) {
      return metersToDisplayUnit(meters, displayUnit)
    }
    return null
  }

  const meters = parseMetricLengthToMeters(s)
  if (meters !== null) {
    return meters
  }
  const feet = parseImperialLengthToDecimalFeet(s)
  if (feet !== null) {
    return feetToDisplayUnit(feet, displayUnit)
  }
  return null
}

export const STAGE_LENGTH_INPUT_HINT =
  'Metric or imperial: 4", 4 in, 1\' 6", 4ft, 0.1m, 100mm, 10cm, 2.5m. Commits on Enter or when leaving the field.'
