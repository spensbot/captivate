import type { PayloadAction } from '@reduxjs/toolkit'
import type { CleanReduxState } from '../renderer/redux/store'
import type { RealtimeState } from '../renderer/redux/realtimeStore'
import type { DmxConnectionInfo, MidiConnections } from '../shared/connection'
import type { UserCommand } from '../shared/ipc_channels'
import {
  isRemoteDispatchAllowed,
  isRemoteUserCommandAllowed,
  type RemoteClientMessage,
  type RemoteControlRuntimeStatus,
  type RemoteServerMessage,
} from '../shared/remoteControl'

export type RemoteSyncHandlers = {
  onControlState: (state: CleanReduxState) => void
  onTimeState: (state: RealtimeState) => void
  onDmxConnection: (payload: DmxConnectionInfo) => void
  onMidiConnection: (payload: MidiConnections) => void
  onDispatch: (action: PayloadAction<unknown>) => void
  onStatus: (status: RemoteControlRuntimeStatus) => void
  onAuthOk: () => void
  onAuthFail: (message: string) => void
}

export class RemoteSync {
  private socket: WebSocket | null = null
  private handlers: RemoteSyncHandlers
  private authenticated = false

  constructor(handlers: RemoteSyncHandlers) {
    this.handlers = handlers
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN && this.authenticated
  }

  connect(wsUrl: string, pin: string): void {
    this.disconnect()
    const socket = new WebSocket(wsUrl)
    this.socket = socket
    socket.onopen = () => {
      this.send({ type: 'auth', pin })
    }
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as RemoteServerMessage
        this.onMessage(msg)
      } catch {
        /* ignore */
      }
    }
    socket.onclose = () => {
      this.authenticated = false
    }
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.close()
      } catch {
        /* ignore */
      }
    }
    this.socket = null
    this.authenticated = false
  }

  sendDispatch(action: PayloadAction<unknown>): void {
    if (!this.isConnected || !isRemoteDispatchAllowed(action)) return
    this.send({ type: 'dispatch', action })
  }

  sendUserCommand(command: UserCommand): void {
    if (!this.isConnected || !isRemoteUserCommandAllowed(command)) return
    this.send({ type: 'user_command', command })
  }

  private send(msg: RemoteClientMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return
    this.socket.send(JSON.stringify(msg))
  }

  private onMessage(msg: RemoteServerMessage): void {
    switch (msg.type) {
      case 'auth_ok':
        this.authenticated = true
        this.handlers.onAuthOk()
        break
      case 'auth_fail':
        this.authenticated = false
        this.handlers.onAuthFail(msg.message)
        break
      case 'control_state':
        this.handlers.onControlState(msg.state)
        break
      case 'time_state':
        this.handlers.onTimeState(msg.state)
        break
      case 'dmx_connection_update':
        this.handlers.onDmxConnection(msg.payload)
        break
      case 'midi_connection_update':
        this.handlers.onMidiConnection(msg.payload)
        break
      case 'dispatch':
        this.handlers.onDispatch(msg.action as PayloadAction<unknown>)
        break
      case 'status':
        this.handlers.onStatus(msg.status)
        break
      default:
        break
    }
  }
}

export function buildRemoteWebSocketUrl(httpUrl: string): string {
  const u = new URL(httpUrl)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  return u.toString()
}
