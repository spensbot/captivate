import VisualizerManager, {
  VisualizerResource,
} from './threejs/VisualizerManager'
import { ipcSetup } from './ipcHandler'
import VisualizerTelemetry from './telemetry/VisualizerTelemetry'

const vm = new VisualizerManager()
let visualizerState: VisualizerResource | null = null
let lastUpdateTime: number | null = null
let currentAspectRatio = 16 / 9
const MAX_FRAME_MS = 1000 / 60
const telemetry = new VisualizerTelemetry('visualizer-renderer')
let rafHandle: number | null = null

const viewport = document.createElement('div')
viewport.style.position = 'fixed'
viewport.style.inset = '0'
viewport.style.display = 'flex'
viewport.style.alignItems = 'center'
viewport.style.justifyContent = 'center'
viewport.style.background = '#000'
viewport.style.overflow = 'hidden'

const stage = document.createElement('div')
stage.style.position = 'relative'
stage.style.background = '#000'
stage.style.maxWidth = '100%'
stage.style.maxHeight = '100%'
stage.style.overflow = 'hidden'

viewport.appendChild(stage)
document.body.appendChild(viewport)
stage.appendChild(vm.getElement())

function targetAspectFromState(state: VisualizerResource | null) {
  const previewAspectRatio =
    state?.state?.control?.visual?.byId?.[state.state.control.visual.active]
      ?.config?.previewAspectRatio
  return previewAspectRatio === '4:3' ? 4 / 3 : 16 / 9
}

function resizeStage() {
  const width = window.innerWidth
  const height = window.innerHeight
  if (width <= 0 || height <= 0) return

  let nextWidth = width
  let nextHeight = Math.round(nextWidth / currentAspectRatio)
  if (nextHeight > height) {
    nextHeight = height
    nextWidth = Math.round(nextHeight * currentAspectRatio)
  }

  stage.style.width = `${nextWidth}px`
  stage.style.height = `${nextHeight}px`
  vm.resize(nextWidth, nextHeight)
  telemetry.gauge('visualizer.viewport', 'width_px', nextWidth, 'px')
  telemetry.gauge('visualizer.viewport', 'height_px', nextHeight, 'px')
}

ipcSetup({
  onNewVisualizerResource: (newState) => {
    visualizerState = newState
    const nextAspectRatio = targetAspectFromState(newState)
    if (nextAspectRatio !== currentAspectRatio) {
      currentAspectRatio = nextAspectRatio
      resizeStage()
    }
  },
})

function animate() {
  rafHandle = null
  const now = performance.now()
  if (visualizerState) {
    if (lastUpdateTime === null) {
      lastUpdateTime = now
    }
    const elapsed = now - lastUpdateTime
    if (elapsed >= MAX_FRAME_MS) {
      const startedAt = performance.now()
      lastUpdateTime = now
      vm.update(elapsed, visualizerState)
      const updateDurationMs = performance.now() - startedAt
      telemetry.onFrameSample(now, elapsed, updateDurationMs, false)
      telemetry.duration(
        'visualizer.performance',
        'vm_update_duration',
        updateDurationMs
      )
      if (updateDurationMs >= 120) {
        telemetry.health(
          'visualizer.performance',
          'warn',
          'Visualizer update step exceeded 120ms',
          { updateDurationMs }
        )
      }
    } else {
      telemetry.onFrameSample(now, elapsed, 0, true)
    }
  } else {
    telemetry.onFrameSample(now, undefined, undefined, true)
  }
  rafHandle = requestAnimationFrame(animate)
}

function startAnimationLoop() {
  if (rafHandle !== null) {
    return
  }
  rafHandle = requestAnimationFrame(animate)
}

function stopAnimationLoop() {
  if (rafHandle === null) {
    return
  }
  cancelAnimationFrame(rafHandle)
  rafHandle = null
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    lastUpdateTime = null
    startAnimationLoop()
  } else {
    stopAnimationLoop()
  }
}

function handleResize() {
  resizeStage()
}

function handleBeforeUnload() {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('visibilitychange', handleVisibilityChange)
  stopAnimationLoop()
  telemetry.stop()
  vm.dispose()
}

window.addEventListener('resize', handleResize)
window.addEventListener('beforeunload', handleBeforeUnload)
window.addEventListener('visibilitychange', handleVisibilityChange)
telemetry.start()

resizeStage()
handleVisibilityChange()
