const GOLDEN_ANGLE = 137.50776405003785

function fixtureHue(index: number): number {
  const normalizedIndex = Math.max(0, index)
  return (normalizedIndex * GOLDEN_ANGLE + 22) % 360
}

function hslaForFixture(
  index: number,
  saturation: number,
  lightness: number,
  alpha: number
): string {
  const hue = fixtureHue(index)
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
}

export function fixtureUniverseColor(index: number): string {
  return hslaForFixture(index, 65, 52, 0.58)
}

export function fixtureCursorColor(index: number, isSelected: boolean): string {
  return hslaForFixture(index, 90, 70, isSelected ? 1.0 : 0.82)
}

export function fixtureSubCursorColor(
  index: number,
  isSelected: boolean
): string {
  return hslaForFixture(index, 80, 65, isSelected ? 0.82 : 0.48)
}

export function fixtureCursorFillColor(
  index: number,
  isSelected: boolean
): string {
  return hslaForFixture(index, 95, 65, isSelected ? 0.25 : 0.1)
}
