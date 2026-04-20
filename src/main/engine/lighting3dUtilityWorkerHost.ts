import fs from 'fs'
import path from 'path'
import { app, utilityProcess, type UtilityProcess } from 'electron'
import type { RealtimeState } from '../../renderer/redux/realtimeStore'
import type { Lighting3dRealtimeTick } from '../../shared/lighting3dPreviewTransport'
import { buildLighting3dRealtimeTick } from './buildLighting3dRealtimeTick'

let emitTick: ((tick: Lighting3dRealtimeTick) => void) | null = null
let child: UtilityProcess | null = null
let lastEmittedSeq = 0

function workerPathCandidates(): string[] {
  const list: string[] = [
    path.join(__dirname, 'lighting3dPreviewWorker.js'),
    path.join(__dirname, '..', '..', 'dist', 'main', 'lighting3dPreviewWorker.js'),
  ]
  if (app.isPackaged) {
    list.unshift(
      path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'dist',
        'main',
        'lighting3dPreviewWorker.js'
      )
    )
  }
  return list
}

function resolveWorkerScript(): string | null {
  for (const candidate of workerPathCandidates()) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

function spawnChild(): boolean {
  const script = resolveWorkerScript()
  if (script === null || emitTick === null) {
    return false
  }
  try {
    child = utilityProcess.fork(script, [], {
      serviceName: 'captivate-lighting3d-preview',
      stdio: 'pipe',
    })
  } catch {
    child = null
    return false
  }

  child.on(
    'message',
    (msg: { type?: string; tick?: Lighting3dRealtimeTick }) => {
      if (msg?.type !== 'tick_out' || msg.tick === undefined || emitTick === null) {
        return
      }
      if (msg.tick.seq <= lastEmittedSeq) {
        return
      }
      lastEmittedSeq = msg.tick.seq
      emitTick(msg.tick)
    }
  )

  child.on('exit', () => {
    child = null
  })

  return true
}

export function initLighting3dUtilityWorker(
  emit: (tick: Lighting3dRealtimeTick) => void
) {
  emitTick = emit
}

export function postLighting3dTickViaUtilityWorker(
  rt: RealtimeState,
  master: number,
  seq: number
): void {
  if (emitTick === null) {
    return
  }
  if (child === null && !spawnChild()) {
    emitTick(buildLighting3dRealtimeTick(rt, master, seq))
    lastEmittedSeq = Math.max(lastEmittedSeq, seq)
    return
  }
  if (child === null) {
    emitTick(buildLighting3dRealtimeTick(rt, master, seq))
    lastEmittedSeq = Math.max(lastEmittedSeq, seq)
    return
  }
  try {
    child.postMessage({
      type: 'tick',
      seq,
      master,
      time: rt.time,
      dmxOutByUniverse: rt.dmxOutByUniverse,
      splitStates: rt.splitStates,
    })
  } catch {
    child = null
    emitTick(buildLighting3dRealtimeTick(rt, master, seq))
    lastEmittedSeq = Math.max(lastEmittedSeq, seq)
  }
}

export function stopLighting3dUtilityWorker() {
  if (child !== null) {
    try {
      child.kill()
    } catch {
      // ignore
    }
    child = null
  }
}
