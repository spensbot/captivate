import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { getStageLightMapPreview } from '../ipcHandler'

const POLL_MS = 140

/** readRenderTargetPixels is WebGL bottom-origin; ImageData / canvas are top-origin. */
function rgbaBottomOriginToTopOrigin(
  src: Uint8Array | number[],
  width: number,
  height: number
): Uint8ClampedArray {
  const stride = width * 4
  const out = new Uint8ClampedArray(width * height * 4)
  for (let row = 0; row < height; row++) {
    const srcRow = height - 1 - row
    for (let c = 0; c < stride; c++) {
      out[row * stride + c] = src[srcRow * stride + c] ?? 0
    }
  }
  // Composite may carry premultiplied / partial alpha; preview reads clearer opaque.
  for (let i = 3; i < out.length; i += 4) {
    out[i] = 255
  }
  return out
}

export default function StageLightMapSplitPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const tick = async () => {
      if (cancelled) return
      try {
        const snap = await getStageLightMapPreview()
        const ctx = canvas.getContext('2d')
        if (!ctx || snap === null || snap.width <= 0 || snap.height <= 0) {
          return
        }
        if (canvas.width !== snap.width || canvas.height !== snap.height) {
          canvas.width = snap.width
          canvas.height = snap.height
        }
        const rgba = rgbaBottomOriginToTopOrigin(
          snap.data,
          snap.width,
          snap.height
        )
        const img = new ImageData(
          new Uint8ClampedArray(rgba),
          snap.width,
          snap.height
        )
        ctx.putImageData(img, 0, 0)
      } catch {
        // IPC may be unavailable in dev harnesses.
      }
    }

    const id = window.setInterval(() => {
      void tick()
    }, POLL_MS)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return (
    <Wrap title="Downsampled visualizer frame (aspect matches the visual scene preview: 16:9 or 4:3). Split XY window crops this onto the stage before per-fixture sampling.">
      <CanvasHost>
        <Canvas ref={canvasRef} />
      </CanvasHost>
      <Caption>Light map</Caption>
    </Wrap>
  )
}

/** Matches XyParamsPad / ZParamsPad plot area: 200×180. */
const Wrap = styled.div`
  position: relative;
  width: 200px;
  height: 180px;
  flex: 0 0 auto;
  box-sizing: border-box;
`

const CanvasHost = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border: 1px solid ${(p) => p.theme.colors.divider};
  box-sizing: border-box;
  overflow: hidden;
`

/** Bitmap is low-res; intrinsic size must not drive layout — fill plot like XyParamsPad/ZParamsPad. */
const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  image-rendering: pixelated;
`

const Caption = styled.span`
  position: absolute;
  left: 0.3rem;
  bottom: 0.2rem;
  font-size: 0.62rem;
  color: #c8d2e8;
  background: #0009;
  border-radius: 0.2rem;
  padding: 0.06rem 0.28rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  pointer-events: none;
`
