import type { StageLightMapGrid } from '../../shared/stageLightMap'

let latest: StageLightMapGrid | null = null
let latestMs = 0

export function ingestStageLightMapFrame(payload: {
  width: number
  height: number
  data: Uint8Array | Buffer | number[]
}) {
  const w = Math.max(0, Math.floor(Number(payload.width)))
  const h = Math.max(0, Math.floor(Number(payload.height)))
  if (w <= 0 || h <= 0) {
    return
  }
  const expected = w * h * 4
  let rgba: Uint8Array
  if (payload.data instanceof Uint8Array) {
    rgba = payload.data
  } else if (typeof Buffer !== 'undefined' && payload.data instanceof Buffer) {
    rgba = new Uint8Array(payload.data)
  } else if (Array.isArray(payload.data)) {
    rgba = Uint8Array.from(payload.data)
  } else {
    return
  }
  if (rgba.length < expected) {
    return
  }
  latest = { width: w, height: h, rgba: rgba.subarray(0, expected) }
  latestMs = Date.now()
}

export function getLatestStageLightMap(maxAgeMs = 600): StageLightMapGrid | null {
  if (latest === null) return null
  if (Date.now() - latestMs > maxAgeMs) return null
  return latest
}

/** Serializable preview for the lighting UI (main renderer). */
export function getStageLightMapPreviewPayload(): {
  width: number
  height: number
  data: number[]
} | null {
  const g = getLatestStageLightMap(1200)
  if (g === null) return null
  return {
    width: g.width,
    height: g.height,
    data: Array.from(g.rgba),
  }
}
