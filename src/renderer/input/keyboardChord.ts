/** Stable keyboard shortcut id (uses `KeyboardEvent.code`). */
function sortedMods(ev: KeyboardEvent): string[] {
  const mods: string[] = []
  if (ev.ctrlKey) mods.push('Ctrl')
  if (ev.shiftKey) mods.push('Shift')
  if (ev.altKey) mods.push('Alt')
  if (ev.metaKey) mods.push('Meta')
  mods.sort()
  return mods
}

export function chordIdFromKeyboardEvent(ev: KeyboardEvent): string {
  const mods = sortedMods(ev)
  if (ev.code === 'ControlLeft' || ev.code === 'ControlRight') {
    return mods.join('+')
  }
  if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') {
    return mods.join('+')
  }
  if (ev.code === 'AltLeft' || ev.code === 'AltRight') {
    return mods.join('+')
  }
  if (ev.code === 'MetaLeft' || ev.code === 'MetaRight') {
    return mods.join('+')
  }
  return mods.length > 0 ? `${mods.join('+')}+${ev.code}` : ev.code
}

export function formatChordId(id: string): string {
  return id.replace(/\+/g, ' + ')
}

/** Ignore lone modifier presses when learning a binding. */
export function isModifierOnlyChord(ev: KeyboardEvent): boolean {
  return (
    ev.code === 'ControlLeft' ||
    ev.code === 'ControlRight' ||
    ev.code === 'ShiftLeft' ||
    ev.code === 'ShiftRight' ||
    ev.code === 'AltLeft' ||
    ev.code === 'AltRight' ||
    ev.code === 'MetaLeft' ||
    ev.code === 'MetaRight'
  )
}
