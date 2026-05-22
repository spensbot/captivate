export type SceneGroups = { [key: string]: boolean | undefined }

export function evaluateSceneGroups(
  sceneGroups: SceneGroups,
  matchesGroup: (group: string) => boolean
): boolean {
  const entries = Object.entries(sceneGroups)
  if (entries.length === 0) {
    return true
  }

  const includeGroups = entries
    .filter(([_, include]) => include === true)
    .map(([group]) => group)
  const excludeGroups = entries
    .filter(([_, include]) => include === false)
    .map(([group]) => group)

  const includePass =
    includeGroups.length === 0 || includeGroups.some((group) => matchesGroup(group))
  const excludePass = excludeGroups.every((group) => !matchesGroup(group))

  return includePass && excludePass
}

export function fixtureGroupsMatchSceneGroups(
  fixtureGroups: readonly string[],
  sceneGroups: SceneGroups
): boolean {
  const normalizedFixtureGroups = new Set(
    fixtureGroups
      .map((group) => group.trim())
      .filter((group) => group.length > 0)
  )
  return evaluateSceneGroups(
    sceneGroups,
    (group) => normalizedFixtureGroups.has(group.trim())
  )
}

/** Whether a scene group selector targets this LED fixture (LEDs/Pixels aliases). */
export function ledFixtureMatchesSceneGroup(
  fixtureGroups: readonly string[],
  sceneGroup: string
): boolean {
  const normalizedSceneGroup = sceneGroup.trim()
  if (normalizedSceneGroup.length <= 0) {
    return false
  }

  const normalizedFixtureGroups = new Set(
    fixtureGroups
      .map((group) => {
        const trimmed = group.trim()
        if (trimmed.length <= 0) {
          return ''
        }
        return trimmed.toLowerCase() === 'pixels' ? 'LEDs' : trimmed
      })
      .filter((group) => group.length > 0)
  )

  if (
    normalizedSceneGroup === 'LEDs' ||
    normalizedSceneGroup === 'Pixels'
  ) {
    return (
      normalizedFixtureGroups.has('LEDs') || normalizedFixtureGroups.has('Pixels')
    )
  }

  return normalizedFixtureGroups.has(normalizedSceneGroup)
}

export function ledFixtureMatchesSceneGroups(
  fixtureGroups: readonly string[],
  sceneGroups: SceneGroups
): boolean {
  return evaluateSceneGroups(sceneGroups, (group) =>
    ledFixtureMatchesSceneGroup(fixtureGroups, group)
  )
}

export function sceneGroupsHasExplicitInclude(sceneGroups: SceneGroups): boolean {
  return Object.values(sceneGroups).some((include) => include === true)
}
