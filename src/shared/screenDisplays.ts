/** Renderer → main: optional target when opening a detached page window. */
export type OpenPageWindowOptions = {
  /** Electron `Display.id`; omit for legacy placement (OS default). */
  displayId?: number
}

/** Serializable screen entry for populating UI (from `screen.getAllDisplays()`). */
export type ScreenDisplayChoice = {
  id: number
  label: string
  isPrimary: boolean
  workArea: { x: number; y: number; width: number; height: number }
}
