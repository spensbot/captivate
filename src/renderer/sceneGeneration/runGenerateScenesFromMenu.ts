import { store } from '../redux/store'
import { resetLightScenes } from '../redux/controlSlice'
import { pushStatusMessage } from '../redux/guiSlice'
import { openAppConfirm } from '../overlays/appDialogService'
import {
  analyzeRigProfile,
  generateLightScenesForRig,
} from '../../shared/sceneGeneration'

export async function runGenerateScenesFromMenu(): Promise<boolean> {
  const state = store.getState()
  const dmx = state.dmx.present
  const profile = analyzeRigProfile({
    universe: dmx.universe,
    fixtureTypesByID: dmx.fixtureTypesByID,
  })

  const fixtureSummary =
    profile.fixtureCount === 0
      ? 'No fixtures are patched yet — scenes will use generic full-stage layouts.'
      : `${profile.fixtureCount} patched fixture(s)` +
        (profile.usableGroups.length > 0
          ? `, groups: ${profile.usableGroups.slice(0, 4).join(', ')}`
          : '') +
        (profile.hasMovers ? ', movers' : '') +
        (profile.hasAtmos ? ', atmosphere' : '')

  const accepted = await openAppConfirm({
    title: 'Generate Scenes?',
    message:
      `Replace all light scenes with a freshly generated set tailored to your rig.\n\n` +
      `${fixtureSummary}\n\n` +
      `This cannot be undone except with Undo (Ctrl+Z). Visual scenes are not changed.`,
    confirmLabel: 'Generate',
    cancelLabel: 'Cancel',
    danger: true,
  })

  if (!accepted) {
    return false
  }

  const currentLight = state.control.present.light
  const generated = generateLightScenesForRig(
    {
      universe: dmx.universe,
      fixtureTypesByID: dmx.fixtureTypesByID,
    },
    {
      seed: Date.now(),
      preserveAuto: currentLight.auto,
    }
  )

  store.dispatch(resetLightScenes(generated))
  store.dispatch(
    pushStatusMessage({
      level: 'info',
      message: `Generated ${generated.ids.length} light scene(s) for your rig.`,
    })
  )
  return true
}
