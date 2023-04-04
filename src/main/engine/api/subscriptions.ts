import { API } from 'features/shared/engine/emissions'
import {
  Context,
  createRendererPublishers,
  createVisualizerPublishers,
} from './core'

export const publishers = (context: Context) => {
  /**


    send_visualizer_state: (payload: VisualizerResource) => {
      const visualizer = _config.visualizerContainer.visualizer
      if (visualizer) {
        visualizer.webContents.send(
          ipcChannelsVisualizer.new_visualizer_state,
          payload
        )
      }
    },

    */
  return {
    ...createRendererPublishers<API['renderer']['subscriptions']>(
      context.renderer,
      {
        dispatch: true,
        dmx_connection_update: true,
        main_command: true,
        midi_connection_update: true,
        new_time_state: true,
      }
    ),
    ...createVisualizerPublishers<API['visualizer']['subscriptions']>(
      context.visualizerContainer,
      {
        new_visualizer_state: true,
      }
    ),
  }
}
