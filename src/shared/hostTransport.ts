import type { PayloadAction } from '@reduxjs/toolkit'
import type { UserCommand } from './ipc_channels'

type HostTransport = {
  sendDispatch: (action: PayloadAction<unknown>) => void
  sendUserCommand: (command: UserCommand) => void
}

let transport: HostTransport | null = null

export function registerHostTransport(next: HostTransport): void {
  transport = next
}

export function clearHostTransport(): void {
  transport = null
}

export function sendDispatchToHost(action: PayloadAction<unknown>): void {
  if (!transport) {
    console.warn('[hostTransport] dispatch ignored — transport not registered')
    return
  }
  transport.sendDispatch(action)
}

export function sendUserCommandToHost(command: UserCommand): void {
  if (!transport) {
    console.warn('[hostTransport] user_command ignored — transport not registered')
    return
  }
  transport.sendUserCommand(command)
}
