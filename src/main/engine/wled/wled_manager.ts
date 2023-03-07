import { RealtimeState } from '../../../renderer/redux/realtimeStore'
import { CleanReduxState } from '../../../renderer/redux/store'
import { getLedValues } from '../../../shared/ledFixtures'
import WledDevice from './wled_device'

export default class WledManager {
  private devices: { [mdns: string]: WledDevice | undefined } = {}
  private pokeInterval
  private broadcastInterval
  private getState
  private getRtState

  constructor(
    getState: () => CleanReduxState | null,
    getRtState: () => RealtimeState
  ) {
    this.getState = getState
    this.getRtState = getRtState

    this.updateDevices()

    this.pokeInterval = setInterval(() => {
      this.updateDevices()
    }, 1000)

    this.broadcastInterval = setInterval(() => {
      const state = this.getState()
      if (state === null) return

      const rtState = this.getRtState()

      for (const fixture of state.dmx.led.ledFixtures) {
        const device = this.devices[fixture.mdns]
        if (device !== undefined) {
          device.broadcast(
            getLedValues(
              rtState.splitStates[0].outputParams,
              fixture,
              state.control.master
            )
          )
        }
      }
    }, 1000 / 60)
  }

  private updateDevices() {
    const state = this.getState()
    if (state === null) return

    for (const fixture of state.dmx.led.ledFixtures) {
      const device = this.devices[fixture.mdns]
      if (device === undefined) {
        this.devices[fixture.mdns] = new WledDevice(fixture.mdns)
      } else {
        device.refresh()
      }
    }
  }

  release() {
    for (const [_mdns, device] of Object.entries(this.devices)) {
      if (device !== undefined) {
        device.release()
      }
    }
    clearInterval(this.pokeInterval)
    clearInterval(this.broadcastInterval)
  }
}
