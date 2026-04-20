# projectM Native Bridge Skeleton

This folder contains the starting skeleton for the native projectM bridge addon.

## Goal
- Own a native `libprojectM` instance.
- Accept PCM audio from Captivate.
- Render frames via OpenGL/FBO.
- Return frame data to Electron through the IPC bridge contract.

## Current status
- JavaScript/TypeScript side contract is implemented.
- Main-process bridge manager can load a compiled `.node` addon if present.
- This native folder is only a scaffold and does not implement real rendering yet.

## Expected output path
- `native/projectm-bridge/projectm_bridge.node`

## Suggested next implementation
1. Implement `createSession`, `pushAudio`, `render`, and `destroySession` in C++.
2. Link against `libprojectM` and required OpenGL libs.
3. Return BGRA frame bytes from `render` (Base64 for IPC MVP).
4. Later move to zero-copy texture/shared-memory handoff.
