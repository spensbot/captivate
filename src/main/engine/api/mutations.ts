import ipcChannels from '../../../features/shared/engine/ipc_channels'

import { onLinkUserCommand } from 'features/bpm/engine/Link'
import { UserCommand } from 'features/shared/engine/ipc_channels'
import { CleanReduxState } from 'renderer/redux/store'
import openVisualizerWindow from '../../../features/visualizer/engine/createVisualizerWindow'
import { createMutation, createMutations } from './core'

export const mutations = createMutations({
  ...createMutation({
    channel: ipcChannels.new_control_state,
    resolve: (ctx, new_state: CleanReduxState) => {
      ctx.new_control_state(new_state)
    },
  }),
  ...createMutation({
    channel: ipcChannels.user_command,
    resolve: (context, command: UserCommand) => {
      onLinkUserCommand(command, context.realtimeState)
    },
  }),
  ...createMutation({
    channel: ipcChannels.open_visualizer,
    resolve: (context) => {
      openVisualizerWindow(context.visualizerContainer)
    },
  }),
})
