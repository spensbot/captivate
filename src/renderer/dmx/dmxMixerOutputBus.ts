import { useEffect, useState } from 'react'

type ChannelListener = (value: number) => void

function channelKey(universe: number, channelIndex: number): string {
  return `${universe}:${channelIndex}`
}

const listenersByChannel = new Map<string, Set<ChannelListener>>()
const lastValuesByChannel = new Map<string, number>()

export function getDmxMixerChannelValue(
  universe: number,
  channelIndex: number
): number | undefined {
  return lastValuesByChannel.get(channelKey(universe, channelIndex))
}

export function subscribeDmxMixerChannel(
  universe: number,
  channelIndex: number,
  listener: ChannelListener
): () => void {
  const key = channelKey(universe, channelIndex)
  let listeners = listenersByChannel.get(key)
  if (listeners === undefined) {
    listeners = new Set()
    listenersByChannel.set(key, listeners)
  }
  listeners.add(listener)

  const current = lastValuesByChannel.get(key)
  if (current !== undefined) {
    listener(current)
  }

  return () => {
    const set = listenersByChannel.get(key)
    if (set === undefined) {
      return
    }
    set.delete(listener)
    if (set.size === 0) {
      listenersByChannel.delete(key)
    }
  }
}

/** Push latest DMX levels; notify only channels whose value changed. */
export function syncDmxMixerOutputs(dmxOutByUniverse: number[][]): void {
  for (let universeIndex = 0; universeIndex < dmxOutByUniverse.length; universeIndex++) {
    const channels = dmxOutByUniverse[universeIndex]
    if (channels === undefined) {
      continue
    }
    const universe = universeIndex + 1
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
      const value = channels[channelIndex] ?? 0
      const key = channelKey(universe, channelIndex)
      const previous = lastValuesByChannel.get(key)
      if (previous === value) {
        continue
      }
      lastValuesByChannel.set(key, value)
      const listeners = listenersByChannel.get(key)
      if (listeners === undefined) {
        continue
      }
      for (const listener of listeners) {
        listener(value)
      }
    }
  }
}

export function useDmxMixerChannelOutput(
  universe: number,
  channelIndex: number
): number {
  const [value, setValue] = useState(
    () => getDmxMixerChannelValue(universe, channelIndex) ?? 0
  )

  useEffect(() => {
    return subscribeDmxMixerChannel(universe, channelIndex, setValue)
  }, [universe, channelIndex])

  return value
}
