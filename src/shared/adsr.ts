import { clamp, lerp, lerp_clamped, Normalized } from '../math/util'

// Attack, Decay, Sustain, Release
// All Ratios
//   a + d + r = 1.0
export interface Adsr {
  a: Normalized
  d: Normalized
  s: Normalized
  r: Normalized
}

function pressed(ratio: number, { a, d, s }: Adsr): Normalized {
  if (ratio < a) {
    return lerp(0, 1, ratio / a)
  } else {
    return lerp_clamped(1, s, ratio / (a + d))
  }
}

export function adsr_ratio(
  ratio_since_pressed: number,
  ratio_since_released: number,
  adsr: Adsr
): Normalized {
  if (ratio_since_pressed < ratio_since_released) {
    // Pressed
    return clamp(ratio_since_pressed, 0, adsr.a + adsr.d)
  } else {
    // Released
    const ratio = adsr.a + adsr.d + ratio_since_released
    return clamp(ratio, 0, 1)
  }
}

export function adsr_level(
  ratio_since_pressed: number,
  ratio_since_released: number,
  adsr: Adsr
): Normalized {
  if (ratio_since_pressed < ratio_since_released) {
    // Pressed
    return pressed(ratio_since_pressed, adsr)
  } else {
    // Released
    const ratio_pressed = ratio_since_pressed - ratio_since_released
    const peak = pressed(ratio_pressed, adsr)

    return lerp_clamped(peak, 0, ratio_since_released / adsr.r)
  }
}

export function adsr_draw(ratio: Normalized, { a, d, s, r }: Adsr): Normalized {
  if (ratio < a) {
    return lerp(0, 1, ratio / a)
  } else if (ratio < a + d) {
    let decaying = ratio - a
    return lerp(1, s, decaying / d)
  } else if (ratio < 1) {
    let releasing = ratio - a - d
    return lerp(s, 0, releasing / r)
  }
  return 0
}
