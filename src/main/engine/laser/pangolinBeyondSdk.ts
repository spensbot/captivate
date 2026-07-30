import fs from 'fs'
import path from 'path'
import { getKoffi } from '../koffiNative'
import type { BeyondSdkPoint } from './pangolinBeyondConvert'
import { beyondZoneListBuffer } from './pangolinBeyondConvert'

let beyondStructsRegistered = false

function ensureBeyondStructs() {
  if (beyondStructsRegistered) {
    return
  }
  getKoffi().struct('CaptivateBeyondPoint', {
    x: 'float',
    y: 'float',
    z: 'float',
    pointColor: 'int',
    repCount: 'uint8',
    focus: 'uint8',
    status: 'uint8',
    zero: 'uint8',
  })
  beyondStructsRegistered = true
}

export type PangolinBeyondApi = {
  ldbCreate: () => number
  ldbDestroy: () => number
  ldbBeyondExeReady: () => number
  ldbBeyondExeStarted: () => number
  ldbGetZoneCount: () => number
  ldbEnableLaserOutput: () => number
  ldbDisableLaserOutput: () => number
  ldbCreateZoneImage: (zoneIndex: number, imageName: string) => number
  ldbDeleteZoneImage: (imageName: string) => number
  ldbSendFrameToImage: (
    imageName: string,
    count: number,
    points: BeyondSdkPoint[],
    zones: Buffer,
    rate: number
  ) => number
}

let cachedLib: PangolinBeyondApi | null = null
let cachedDllPath: string | null = null

function candidateDllPaths(target: string): string[] {
  const t = target.trim()
  const out: string[] = []
  if (t.length > 0 && /\.dll$/i.test(t)) {
    out.push(path.resolve(t))
  }
  const env = process.env.CAPTIVATE_BEYOND_SDK_DLL?.trim()
  if (env) out.push(path.resolve(env))

  const roots = [
    process.env['ProgramFiles'],
    process.env['ProgramFiles(x86)'],
    process.cwd(),
    path.join(process.cwd(), 'assets', 'pangolin'),
    path.join(process.cwd(), 'resources', 'assets', 'pangolin'),
  ].filter((r): r is string => typeof r === 'string' && r.length > 0)

  const names = ['BEYONDIO.dll', 'BeyondIO.dll']
  const subdirs = [
    '',
    'Beyond',
    'Pangolin',
    'Pangolin\\Beyond',
    'Pangolin Laser Systems\\Beyond',
  ]
  for (const root of roots) {
    for (const sub of subdirs) {
      for (const name of names) {
        out.push(path.join(root, sub, name))
      }
    }
  }
  return [...new Set(out)]
}

export function resolveBeyondDllPath(target: string): string {
  for (const p of candidateDllPaths(target)) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      /* ignore */
    }
  }
  throw new Error(
    'BEYONDIO.dll not found. Install Pangolin BEYOND, copy BEYONDIO.dll from the BEYOND install folder, set Target to the full DLL path, or set CAPTIVATE_BEYOND_SDK_DLL.'
  )
}

export function loadPangolinBeyondSdk(target: string): PangolinBeyondApi {
  const dllPath = resolveBeyondDllPath(target)
  if (cachedLib && cachedDllPath === dllPath) return cachedLib

  ensureBeyondStructs()
  const lib = getKoffi().load(dllPath)
  const api: PangolinBeyondApi = {
    ldbCreate: lib.func('int ldbCreate()'),
    ldbDestroy: lib.func('int ldbDestroy()'),
    ldbBeyondExeReady: lib.func('int ldbBeyondExeReady()'),
    ldbBeyondExeStarted: lib.func('int ldbBeyondExeStarted()'),
    ldbGetZoneCount: lib.func('int ldbGetZoneCount()'),
    ldbEnableLaserOutput: lib.func('int ldbEnableLaserOutput()'),
    ldbDisableLaserOutput: lib.func('int ldbDisableLaserOutput()'),
    ldbCreateZoneImage: lib.func(
      'int ldbCreateZoneImage(int zoneIndex, str imageName)'
    ),
    ldbDeleteZoneImage: lib.func('int ldbDeleteZoneImage(str imageName)'),
    ldbSendFrameToImage: lib.func(
      'int ldbSendFrameToImage(str imageName, int count, CaptivateBeyondPoint *points, uint8 *zones, int rate)'
    ),
  }
  cachedLib = api
  cachedDllPath = dllPath
  return api
}

export function sendBeyondFrame(
  api: PangolinBeyondApi,
  imageName: string,
  points: BeyondSdkPoint[],
  zoneIndex0: number,
  pointRatePps: number
): void {
  if (points.length <= 0) {
    api.ldbSendFrameToImage(imageName, 0, [], beyondZoneListBuffer(zoneIndex0), -pointRatePps)
    return
  }
  const count = Math.min(8192, points.length)
  const slice = points.slice(0, count)
  const rate = -Math.max(100, Math.min(200000, Math.round(pointRatePps)))
  const zones = beyondZoneListBuffer(zoneIndex0)
  const ok = api.ldbSendFrameToImage(imageName, count, slice, zones, rate)
  if (ok !== 1) {
    throw new Error(`ldbSendFrameToImage failed for ${imageName} (code ${ok}).`)
  }
}

export async function waitForBeyondReady(
  api: PangolinBeyondApi,
  timeoutMs = 15000
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (api.ldbBeyondExeReady() === 1) return true
    if (api.ldbBeyondExeStarted() !== 1) return false
    await new Promise((r) => setTimeout(r, 50))
  }
  return api.ldbBeyondExeReady() === 1
}
