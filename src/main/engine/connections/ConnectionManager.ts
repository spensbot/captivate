import { SerialPort } from 'serialport'
import {
  ConnectionId,
  DmxConnectionInfo,
  DmxDevice_t,
  SerialportInfo,
} from 'shared/connection'
import { DmxConnection, createDmxConnection } from './dmx/DmxConnection'
import { getDmxDevice } from './dmx/DmxDevice_t'
import { ArtNetManager } from './art-net/ArtNetManager'
import { CleanReduxState } from 'renderer/redux/store'
import { RealtimeState } from 'renderer/redux/realtimeStore'

export class ConnectionManager {
  private getControlState: () => CleanReduxState | null
  private getRealtimeState: () => RealtimeState
  private dmxConnections: { [key: ConnectionId]: DmxConnection } = {}
  private artNet: ArtNetManager

  constructor(
    getControlState: () => CleanReduxState | null,
    getRealtimeState: () => RealtimeState
  ) {
    this.getControlState = getControlState
    this.getRealtimeState = getRealtimeState
    this.artNet = new ArtNetManager(this.getRealtimeState, this.getControlState)
  }

  async updateConnections(
    connectTo_list: ConnectionId[]
  ): Promise<DmxConnectionInfo> {
    const connectTo = new Set(connectTo_list)

    const [availableDevices, serialports] = await this.availableDevices()

    this.makeConnections(connectTo, availableDevices)

    this.pruneConnections(connectTo)

    let status: DmxConnectionInfo = {
      connected: Object.keys(this.dmxConnections),
      available: availableDevices,
      serialports,
      artNet: this.artNet.updateConnections(),
    }

    return status
  }

  private async availableDevices(): Promise<[DmxDevice_t[], SerialportInfo[]]> {
    const serialports = await SerialPort.list()

    const availableDevices = serialports
      .map((p) => getDmxDevice(p))
      .reduce<DmxDevice_t[]>((acc, p) => {
        if (p !== null) acc.push(p)
        return acc
      }, [])

    return [availableDevices, serialports]
  }

  private async makeConnections(
    connectTo: Set<ConnectionId>,
    availableDevices: DmxDevice_t[]
  ) {
    const shouldConnect = (device: DmxDevice_t) => {
      return (
        this.dmxConnections[device.connectionId] === undefined &&
        connectTo.has(device.connectionId)
      )
    }

    const newConnections = await Promise.all(
      availableDevices
        .filter((device) => shouldConnect(device))
        .map((device) => createDmxConnection(device, this.getRealtimeState))
    )

    for (const connection of newConnections) {
      console.log(`Connection made ${connection.device.connectionId}`)
      this.dmxConnections[connection.device.connectionId] = connection
    }
  }

  private pruneConnections(connectTo: Set<ConnectionId>) {
    for (const [id, connection] of Object.entries(this.dmxConnections)) {
      if (
        !connectTo.has(connection.device.connectionId) ||
        !connection.isOpen()
      ) {
        console.log(`Connection pruned ${connection.device.connectionId}`)
        connection.disconnect()
        delete this.dmxConnections[id]
      }
    }
  }
}
