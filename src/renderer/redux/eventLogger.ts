import { Middleware } from 'redux'
import throttle from 'lodash.throttle'
import { logEvent } from 'renderer/3rd-party/initFirebase'

export function logEventThrottled(eventName: string, throttleMs: number) {
  return throttle((params: { [key: string]: any } | undefined = undefined) => {
    logEvent(eventName, params)
  }, throttleMs)
}

export class EventThrottleMap {
  private throttledMap: {
    [id: string]: ReturnType<typeof throttle> | undefined
  } = {}
  private f: (eventName: string, params: any) => void
  private period: number

  constructor(f: (eventName: string, params: any) => void, period: number) {
    this.f = f
    this.period = period
  }

  call(eventName: string, params: any) {
    let throttled = this.throttledMap[eventName]
    if (throttled === undefined) {
      // leading and trailing set to true ensures that the first and last midi note during the interval are always sent
      throttled = throttle(this.f, this.period, {
        leading: true,
        trailing: true,
      })
      this.throttledMap[eventName] = throttled
    }
    throttled(eventName, params)
  }
}

const _eventThrottleMap = new EventThrottleMap(logEvent, 500)

const eliminatedEvents: Set<string> = new Set(['gui_setDmx', 'gui_setMidi'])

function getEventName(action: any): string {
  return action.type.replaceAll('/', '_')
}

type FirebaseParams = { [key: string]: any } | undefined

function getEventParams(action: any): FirebaseParams {
  const val = action.payload
  const type = typeof val
  switch (type) {
    case 'bigint':
      return { val, str: val.toString() }
    case 'boolean':
      return { val, str: val.toString() }
    case 'number':
      return { val, str: val.toString() }
    case 'string':
      return { str: (val as string).slice(0, 100) }
    case 'object':
      return makeFirebaseSafe(val, 1, 5, 100)
    default:
      return { str: type }
  }
}

function makeFirebaseSafe(
  val: any,
  maxDepth: number,
  maxWidth: number,
  maxStringLength: number
): any {
  const type = typeof val
  switch (type) {
    case 'bigint':
      return val
    case 'boolean':
      return val
    case 'number':
      return val
    case 'string':
      return (val as string).slice(0, maxStringLength)
    case 'object': {
      if (val === null) return val
      if (maxDepth < 1) return type
      let safeObject: FirebaseParams = {}
      for (const [key, subValue] of Object.entries(val).slice(0, maxWidth)) {
        safeObject[key] = makeFirebaseSafe(
          subValue,
          maxDepth - 1,
          maxWidth,
          maxStringLength
        )
      }
      return safeObject
    }
    default:
      return type
  }
}

const eventLogger: Middleware = (_) => (next) => (action) => {
  const eventName = getEventName(action)
  if (!eliminatedEvents.has(eventName)) {
    _eventThrottleMap.call(eventName, getEventParams(action))
  }
  return next(action)
}

export default eventLogger
