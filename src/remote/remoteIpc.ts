import type { PayloadAction } from '@reduxjs/toolkit'
import type { UserCommand } from '../shared/ipc_channels'
import type { RemoteSync } from './remoteSync'

let _sync: RemoteSync | null = null

export function bindRemoteSync(sync: RemoteSync): void {
  _sync = sync
}

export function send_dispatch_to_main(action: PayloadAction<unknown>): void {
  _sync?.sendDispatch(action)
}

export function send_user_command(command: UserCommand): void {
  _sync?.sendUserCommand(command)
}
