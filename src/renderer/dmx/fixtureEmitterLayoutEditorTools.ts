import {
  autoResizeEmittersToFitFace,
  bundleSubfixtureChannelsOntoEmitters,
  bundleMultiStripWashBarSubfixtureChannels,
  type FixtureEmitterDefinition,
  type FixtureModelConfig,
  type FixtureType,
  inferFixtureModelKind,
  normalizeRectEmitterFaceDimensionsM,
  resolveEmitterSubFixtureIndex,
} from '../../shared/dmxFixtures'

/** Distinct row tints per subfixture group in the channel list (RGBA). */
export const EMITTER_CHANNEL_SUBFIXTURE_ROW_COLORS = [
  'rgba(70, 110, 180, 0.22)',
  'rgba(90, 150, 100, 0.22)',
  'rgba( 160, 120, 70, 0.22)',
  'rgba(140, 90, 150, 0.22)',
  'rgba(100, 140, 160, 0.22)',
  'rgba(150, 100, 100, 0.22)',
  'rgba(120, 150, 90, 0.22)',
  'rgba(130, 100, 130, 0.22)',
] as const

export const EMITTER_CHANNEL_NO_SUBFIXTURE_ROW_COLOR = 'rgba(255, 255, 255, 0.04)'

export type EditorCanvasTool = 'select' | 'move'

export function sortEmittersLeftTopRightBottom(
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition[] {
  return [...emitters].sort((a, b) => a.y - b.y || a.x - b.x)
}

export function getReferenceEmitter(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition | null {
  const selected = emitters.filter((e) => selectedIds.has(e.id))
  if (selected.length === 0) {
    return null
  }
  for (const id of selectionOrder) {
    if (!selectedIds.has(id)) {
      continue
    }
    const hit = emitters.find((e) => e.id === id)
    if (hit !== undefined) {
      return hit
    }
  }
  return sortEmittersLeftTopRightBottom(selected)[0] ?? null
}

export function getFirstAndLastSelectedByOrder(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): { first: FixtureEmitterDefinition | null; last: FixtureEmitterDefinition | null } {
  const ordered = selectionOrder
    .map((id) => emitters.find((e) => e.id === id))
    .filter((e): e is FixtureEmitterDefinition => e !== undefined && selectedIds.has(e.id))
  if (ordered.length === 0) {
    const sorted = sortEmittersLeftTopRightBottom(
      emitters.filter((e) => selectedIds.has(e.id))
    )
    return {
      first: sorted[0] ?? null,
      last: sorted[sorted.length - 1] ?? null,
    }
  }
  return {
    first: ordered[0] ?? null,
    last: ordered[ordered.length - 1] ?? null,
  }
}

export type SelectionSubFixtureState =
  | { kind: 'none' }
  | { kind: 'mixed' }
  | { kind: 'assigned'; subIndex: number }

/** Subfixture/channel UI scope — grouped emitters act as one. */
export type LogicalChannelSelection = {
  editIds: ReadonlySet<string>
  showAsSingle: boolean
  isGroup: boolean
}

export function idsForEmitterGroup(
  emitters: FixtureEmitterDefinition[],
  groupId: string
): string[] {
  return emitters.filter((emitter) => emitter.groupId === groupId).map((e) => e.id)
}

export function logicalChannelSelection(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>
): LogicalChannelSelection {
  if (selectedIds.size === 0) {
    return { editIds: selectedIds, showAsSingle: false, isGroup: false }
  }
  const selected = emitters.filter((emitter) => selectedIds.has(emitter.id))
  if (selected.length === 0) {
    return { editIds: selectedIds, showAsSingle: false, isGroup: false }
  }

  const groupId = selected[0]?.groupId
  if (groupId !== undefined && groupId.length > 0) {
    const allSameGroup = selected.every((emitter) => emitter.groupId === groupId)
    if (allSameGroup) {
      const groupMemberIds = idsForEmitterGroup(emitters, groupId)
      const groupSet = new Set(groupMemberIds)
      const coversGroup =
        groupMemberIds.length > 0 &&
        groupMemberIds.every((id) => selectedIds.has(id))
      if (coversGroup || selected.length === 1) {
        return {
          editIds: groupSet,
          showAsSingle: true,
          isGroup: groupMemberIds.length > 1,
        }
      }
    }
  }

  if (selectedIds.size === 1) {
    return { editIds: selectedIds, showAsSingle: true, isGroup: false }
  }

  return { editIds: selectedIds, showAsSingle: false, isGroup: false }
}

export function selectionTargetIdsForPointer(
  emitters: FixtureEmitterDefinition[],
  emitterId: string
): string[] {
  const emitter = emitters.find((e) => e.id === emitterId)
  if (emitter?.groupId !== undefined && emitter.groupId.length > 0) {
    const groupIds = idsForEmitterGroup(emitters, emitter.groupId)
    if (groupIds.length > 0) {
      return groupIds
    }
  }
  return [emitterId]
}

export function selectionSubFixtureState(
  fixtureType: FixtureType,
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>
): SelectionSubFixtureState {
  if (fixtureType.subFixtures.length === 0 || selectedIds.size === 0) {
    return { kind: 'none' }
  }
  const indices = new Set<number>()
  for (const emitter of emitters) {
    if (!selectedIds.has(emitter.id)) {
      continue
    }
    const idx = resolveEmitterSubFixtureIndex(fixtureType, emitter)
    if (idx !== null) {
      indices.add(idx)
    }
  }
  if (indices.size === 0) {
    return { kind: 'none' }
  }
  if (indices.size > 1) {
    return { kind: 'mixed' }
  }
  return { kind: 'assigned', subIndex: [...indices][0]! }
}

export function assignSubFixtureToSelected(
  fixtureType: FixtureType,
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  subIndex: number
): FixtureEmitterDefinition[] {
  const sub = fixtureType.subFixtures[subIndex]
  if (sub === undefined) {
    return emitters
  }
  const allowed = new Set(sub.channels)
  return emitters.map((emitter) => {
    if (!selectedIds.has(emitter.id)) {
      return emitter
    }
    return {
      ...emitter,
      subFixtureIndex: subIndex,
      channelIndexes: emitter.channelIndexes.filter((ch) => allowed.has(ch)),
    }
  })
}

export function channelsForSubFixture(
  fixtureType: FixtureType,
  subIndex: number
): number[] {
  const sub = fixtureType.subFixtures[subIndex]
  if (sub === undefined) {
    return []
  }
  return [...sub.channels].sort((a, b) => a - b)
}

export function subFixtureIndexForChannel(
  fixtureType: FixtureType,
  channelIndex: number
): number {
  for (let i = 0; i < fixtureType.subFixtures.length; i++) {
    const sub = fixtureType.subFixtures[i]
    if (sub !== undefined && sub.channels.includes(channelIndex)) {
      return i
    }
  }
  return -1
}

export function channelListRowBackground(
  fixtureType: FixtureType,
  channelIndex: number
): string {
  const subIdx = subFixtureIndexForChannel(fixtureType, channelIndex)
  if (subIdx < 0) {
    return EMITTER_CHANNEL_NO_SUBFIXTURE_ROW_COLOR
  }
  return (
    EMITTER_CHANNEL_SUBFIXTURE_ROW_COLORS[
      subIdx % EMITTER_CHANNEL_SUBFIXTURE_ROW_COLORS.length
    ] ?? EMITTER_CHANNEL_NO_SUBFIXTURE_ROW_COLOR
  )
}

export function emitterCenterInNormalizedRect(
  emitter: FixtureEmitterDefinition,
  rect: { x0: number; y0: number; x1: number; y1: number }
): boolean {
  const left = Math.min(rect.x0, rect.x1)
  const right = Math.max(rect.x0, rect.x1)
  const top = Math.min(rect.y0, rect.y1)
  const bottom = Math.max(rect.y0, rect.y1)
  return (
    emitter.x >= left &&
    emitter.x <= right &&
    emitter.y >= top &&
    emitter.y <= bottom
  )
}

function copySizeFromReference(
  target: FixtureEmitterDefinition,
  reference: FixtureEmitterDefinition
): FixtureEmitterDefinition {
  if (reference.shape === 'disc') {
    return {
      ...target,
      size: reference.size,
      rectWidthM: undefined,
      rectHeightM: undefined,
    }
  }
  const face = normalizeRectEmitterFaceDimensionsM(reference)
  return {
    ...target,
    size: reference.size,
    rectWidthM: face.widthM,
    rectHeightM: face.heightM,
  }
}

function copyShapeFromReference(
  target: FixtureEmitterDefinition,
  reference: FixtureEmitterDefinition
): FixtureEmitterDefinition {
  const shape = reference.shape
  if (shape === 'disc') {
    return {
      ...target,
      shape,
      size: reference.size,
      rectWidthM: undefined,
      rectHeightM: undefined,
    }
  }
  const face = normalizeRectEmitterFaceDimensionsM(reference)
  return {
    ...target,
    shape,
    size: reference.size,
    rectWidthM: face.widthM,
    rectHeightM: face.heightM,
  }
}

export function applyMatchSizeToReference(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition[] {
  const reference = getReferenceEmitter(emitters, selectedIds, selectionOrder)
  if (reference === null) {
    return emitters
  }
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id) && emitter.id !== reference.id
      ? copySizeFromReference(emitter, reference)
      : emitter
  )
}

export function applyMatchShapeToReference(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition[] {
  const reference = getReferenceEmitter(emitters, selectedIds, selectionOrder)
  if (reference === null) {
    return emitters
  }
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id) ? copyShapeFromReference(emitter, reference) : emitter
  )
}

export function applyAlignVerticalCenterToReference(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition[] {
  const reference = getReferenceEmitter(emitters, selectedIds, selectionOrder)
  if (reference === null) {
    return emitters
  }
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id) ? { ...emitter, y: reference.y } : emitter
  )
}

export function applyAlignHorizontalCenterToReference(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition[] {
  const reference = getReferenceEmitter(emitters, selectedIds, selectionOrder)
  if (reference === null) {
    return emitters
  }
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id) ? { ...emitter, x: reference.x } : emitter
  )
}

export function applyDistributeHorizontalBetweenEndpoints(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition[] {
  const { first, last } = getFirstAndLastSelectedByOrder(
    emitters,
    selectedIds,
    selectionOrder
  )
  if (first === null || last === null || first.id === last.id) {
    return emitters
  }
  const ordered = selectionOrder
    .map((id) => emitters.find((e) => e.id === id))
    .filter((e): e is FixtureEmitterDefinition => e !== undefined && selectedIds.has(e.id))
  if (ordered.length < 3) {
    return emitters
  }
  const x0 = first.x
  const x1 = last.x
  return emitters.map((emitter) => {
    const idx = ordered.findIndex((e) => e.id === emitter.id)
    if (idx < 0) {
      return emitter
    }
    if (idx === 0 || idx === ordered.length - 1) {
      return emitter
    }
    const t = idx / (ordered.length - 1)
    return { ...emitter, x: x0 + (x1 - x0) * t }
  })
}

export function applyDistributeVerticalBetweenEndpoints(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition[] {
  const { first, last } = getFirstAndLastSelectedByOrder(
    emitters,
    selectedIds,
    selectionOrder
  )
  if (first === null || last === null || first.id === last.id) {
    return emitters
  }
  const ordered = selectionOrder
    .map((id) => emitters.find((e) => e.id === id))
    .filter((e): e is FixtureEmitterDefinition => e !== undefined && selectedIds.has(e.id))
  if (ordered.length < 3) {
    return emitters
  }
  const y0 = first.y
  const y1 = last.y
  return emitters.map((emitter) => {
    const idx = ordered.findIndex((e) => e.id === emitter.id)
    if (idx < 0) {
      return emitter
    }
    if (idx === 0 || idx === ordered.length - 1) {
      return emitter
    }
    const t = idx / (ordered.length - 1)
    return { ...emitter, y: y0 + (y1 - y0) * t }
  })
}

export function applyAutoSizeSelectedAtPositions(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  faceWidthM: number,
  faceHeightM: number
): FixtureEmitterDefinition[] {
  if (selectedIds.size === 0) {
    return emitters
  }
  const positions = emitters.map((e) => ({ x: e.x, y: e.y }))
  const resized = autoResizeEmittersToFitFace(
    emitters,
    positions,
    faceWidthM,
    faceHeightM
  )
  return emitters.map((emitter, index) =>
    selectedIds.has(emitter.id) ? resized[index]! : emitter
  )
}

export function applyAutoAssignChannelsSequential(
  fixtureType: FixtureType,
  model: FixtureModelConfig,
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  selectionOrder: readonly string[]
): FixtureEmitterDefinition[] {
  if (fixtureType.subFixtures.length === 0 || selectedIds.size === 0) {
    return emitters
  }
  const orderedSelected = selectionOrder
    .map((id) => emitters.find((e) => e.id === id))
    .filter((e): e is FixtureEmitterDefinition => e !== undefined && selectedIds.has(e.id))
  const toAssign =
    orderedSelected.length > 0
      ? orderedSelected
      : sortEmittersLeftTopRightBottom(emitters.filter((e) => selectedIds.has(e.id)))

  const normalizedKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const ePer = Math.max(1, Math.round(model.emittersPerSubFixture))
  const subs = fixtureType.subFixtures

  const assignOne = (
    emitter: FixtureEmitterDefinition,
    subIndex: number
  ): FixtureEmitterDefinition => {
    const sub = subs[Math.min(Math.max(0, subIndex), subs.length - 1)]
    if (sub === undefined || sub.channels.length === 0) {
      return emitter
    }
    const maxChannelIndex = fixtureType.channels.length - 1
    const bundle = sub.channels.filter(
      (c) => c >= 0 && c <= maxChannelIndex
    )
    if (bundle.length === 0) {
      return emitter
    }
    return {
      ...emitter,
      subFixtureIndex: subIndex,
      channelIndexes: [...new Set(bundle)].sort((a, b) => a - b),
    }
  }

  const out = emitters.map((emitter) => {
    const orderIdx = toAssign.findIndex((e) => e.id === emitter.id)
    if (orderIdx < 0) {
      return emitter
    }
    return assignOne(emitter, Math.min(orderIdx, subs.length - 1))
  })

  if (
    normalizedKind === 'washBar' &&
    model.washBarLayoutMode === 'multiStrip'
  ) {
    return bundleMultiStripWashBarSubfixtureChannels(
      fixtureType,
      model.washBarRgbCount,
      model.washBarWarmWhiteCount,
      model.washBarCoolWhiteCount,
      out
    )
  }

  return bundleSubfixtureChannelsOntoEmitters(fixtureType, ePer, out)
}

export function applyGroupSelected(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  groupId: string
): FixtureEmitterDefinition[] {
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id) ? { ...emitter, groupId } : emitter
  )
}

export function applyUngroupSelected(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>
): FixtureEmitterDefinition[] {
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id) ? { ...emitter, groupId: undefined } : emitter
  )
}

export function nudgeSelectedEmitters(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  dx: number,
  dy: number
): FixtureEmitterDefinition[] {
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id)
      ? {
          ...emitter,
          x: Math.max(0, Math.min(1, emitter.x + dx)),
          y: Math.max(0, Math.min(1, emitter.y + dy)),
        }
      : emitter
  )
}

export function clearChannelsForSelected(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>
): FixtureEmitterDefinition[] {
  return emitters.map((emitter) =>
    selectedIds.has(emitter.id) ? { ...emitter, channelIndexes: [] } : emitter
  )
}

export function toggleChannelForSelected(
  fixtureType: FixtureType,
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  channelIndex: number,
  subIndex: number | null
): FixtureEmitterDefinition[] {
  if (
    fixtureType.subFixtures.length > 0 &&
    subIndex !== null &&
    !fixtureType.subFixtures[subIndex]?.channels.includes(channelIndex)
  ) {
    return emitters
  }
  const selected = emitters.filter((e) => selectedIds.has(e.id))
  const allHave =
    selected.length > 0 &&
    selected.every((e) => e.channelIndexes.includes(channelIndex))
  return emitters.map((emitter) => {
    if (!selectedIds.has(emitter.id)) {
      return emitter
    }
    if (allHave) {
      return {
        ...emitter,
        channelIndexes: emitter.channelIndexes.filter((i) => i !== channelIndex),
      }
    }
    if (emitter.channelIndexes.includes(channelIndex)) {
      return emitter
    }
    return {
      ...emitter,
      channelIndexes: [...emitter.channelIndexes, channelIndex].sort((a, b) => a - b),
    }
  })
}

export function channelActiveForSelection(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  channelIndex: number
): boolean {
  const selected = emitters.filter((e) => selectedIds.has(e.id))
  if (selected.length === 0) {
    return false
  }
  return selected.every((e) => e.channelIndexes.includes(channelIndex))
}

export function channelIndeterminateForSelection(
  emitters: FixtureEmitterDefinition[],
  selectedIds: ReadonlySet<string>,
  channelIndex: number
): boolean {
  const selected = emitters.filter((e) => selectedIds.has(e.id))
  if (selected.length <= 1) {
    return false
  }
  const any = selected.some((e) => e.channelIndexes.includes(channelIndex))
  const all = selected.every((e) => e.channelIndexes.includes(channelIndex))
  return any && !all
}
