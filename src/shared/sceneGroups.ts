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
