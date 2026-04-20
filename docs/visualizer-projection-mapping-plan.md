# Visualizer Projection Mapping Plan (Research + Implementation)

## Goal
Add an optional projection-mapping mode to the built-in visualizer so users can:
- resize output regions
- split/clone/section the same visualizer source
- corner-pin/keystone each mapped output
- arrange mapped outputs in a single preview viewport

## Recommended Architecture

1. Render visualizer content once to an offscreen `WebGLRenderTarget`.
2. In a second pass, draw one quad per mapping surface.
3. Each surface samples from the same source texture using:
   - a source rectangle (crop/section)
   - per-surface transform (position/scale/rotation)
   - 4-corner keystone warp (homography or bilinear corner mapping)
4. Composite all surfaces to the final viewport with scissor/viewport support.

This avoids re-rendering the full visualizer for each mapped region and keeps frame cost bounded.

## Why this is the correct setup

- Three.js supports offscreen render targets and explicit viewport/scissor control, which is the canonical path for multi-region compositing:
  - `WebGLRenderer.setRenderTarget()`
  - `WebGLRenderer.setViewport()`
  - `WebGLRenderer.setScissor()`
- Keystone/corner-pin is a projective transform problem (homography), using four point correspondences.
- Multi-view / multi-rect rendering is already a standard pattern in Three.js examples.

## Data Model to Add

```ts
interface ProjectionSurface {
  id: string
  enabled: boolean
  name: string
  // output placement in preview space (normalized)
  rect: { x: number; y: number; w: number; h: number }
  // optional crop of source texture (normalized)
  sourceRect: { x: number; y: number; w: number; h: number }
  // corner pin in output-local normalized coordinates
  corners: {
    tl: { x: number; y: number }
    tr: { x: number; y: number }
    br: { x: number; y: number }
    bl: { x: number; y: number }
  }
  opacity: number
  blendMode: 'normal' | 'add' | 'screen'
  feather: number
  cloneGroupId?: string
}

interface ProjectionMappingConfig {
  enabled: boolean
  outputResolution: { width: number; height: number }
  surfaces: ProjectionSurface[]
}
```

## UI Plan

- Add `Projection Mapping` toggle in Visualizer settings (optional mode).
- Add a `Surfaces` panel:
  - add/remove surface
  - clone surface
  - duplicate-with-offset
  - source section picker
- Add a mapping canvas overlay with draggable corner handles.
- Add test-pattern preview modes (grid, checker, crosshair) per surface.

## Performance Rules

- Keep one source render per frame.
- Rebuild mapping mesh only when topology changes.
- Update only uniforms during dragging.
- Use WebGL2 where available and clamp internal projection mapping resolution.
- Optional: quality scaling while handles are actively dragged.

## Incremental Delivery

1. **Phase 1 (MVP)**: split/clone/section + rect placement, no keystone.
2. **Phase 2**: per-surface corner-pin keystone + save/load.
3. **Phase 3**: edge feather/blend + masks + calibration workflow.
4. **Phase 4**: multi-projector output profiles and per-output gamma/brightness trims.

## References

- Three.js `WebGLRenderer` docs (render target + viewport + scissor):
  - https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js multi-view rendering example:
  - https://threejs.org/examples/webgl_multiple_views.html
- OpenCV homography tutorial (4-point projective transform background):
  - https://docs.opencv.org/4.x/d9/dab/tutorial_homography.html
- Homography.js (JS reference implementation for projective/corner-pin style transforms):
  - https://github.com/Eric-Canas/Homography.js
