import { powerSaveBlocker } from 'electron'

let active_prevent_sleep_id = 0

export function prevent_sleep() {
  active_prevent_sleep_id = powerSaveBlocker.start('prevent-display-sleep')
  console.info(
    `Sleep Prevented: ${powerSaveBlocker.isStarted(active_prevent_sleep_id)}`
  )
}

export function allow_sleep() {
  powerSaveBlocker.stop(active_prevent_sleep_id)
}

prevent_sleep()
