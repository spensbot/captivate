import { RealtimeState, initRealtimeState } from 'features/redux/realtimeStore'
import { TimeState } from '../shared/TimeState'
import { createBpmController } from './Link'
import { UserCommand } from 'features/shared/engine/ipc_channels'
export * from './Link'
export const createRealtimeManager = ({
  next,
  onUpdate,
}: {
  next: (
    previousState: { realtime: RealtimeState },
    newStates: { time: TimeState }
  ) => RealtimeState
  onUpdate: (newStates: { time: TimeState; realtime: RealtimeState }) => void
}) => {
  const bpmController = createBpmController()
  const realtimeStateRef: { current: RealtimeState } = {
    current: initRealtimeState(),
  }

  const createRealtimeLoop = (callback: () => void) => {
    const realtimeStateInterval = setInterval(callback, 1000 / 90)

    return {
      dispose() {
        clearInterval(realtimeStateInterval)
      },
    }
  }

  return {
    realtimeStateRef,
    bpmController,
    start() {
      return createRealtimeLoop(() => {
        const nextTimeState = bpmController.getNextTimeState()

        realtimeStateRef.current = next(
          { realtime: realtimeStateRef.current },
          { time: nextTimeState }
        )

        onUpdate({ realtime: realtimeStateRef.current, time: nextTimeState })
      })
    },
  }
}

export type RealtimeManager = ReturnType<typeof createRealtimeManager>

export const onLinkUserCommand = (
  command: UserCommand,
  realtimeManager: RealtimeManager
) => {
  const realtimeState = realtimeManager.realtimeStateRef.current
  const { nodeLink, tapTempo } = realtimeManager.bpmController
  if (command.type === 'IncrementTempo') {
    nodeLink.setTempo(realtimeState.time.bpm + command.amount)
  } else if (command.type === 'SetLinkEnabled') {
    nodeLink.enable(command.isEnabled)
  } else if (command.type === 'EnableStartStopSync') {
    nodeLink.enableStartStopSync(command.isEnabled)
  } else if (command.type === 'SetIsPlaying') {
    nodeLink.setIsPlaying(command.isPlaying)
  } else if (command.type === 'SetBPM') {
    nodeLink.setTempo(command.bpm)
  } else if (command.type === 'TapTempo') {
    tapTempo()
  }
}
