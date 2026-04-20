import makeMdns from 'multicast-dns'
import { WledDiscoveredController } from '../../../shared/wledDiscovery'

const WLED_SERVICE_NAME = '_wled._tcp.local'
const DEFAULT_TIMEOUT_MS = 1800
const MAX_TIMEOUT_MS = 8000

interface DiscoveredService {
  serviceName: string
  host: string | null
  ip: string | null
}

export async function discoverWledControllers(
  timeoutMs?: number
): Promise<WledDiscoveredController[]> {
  return new Promise((resolve) => {
    const mdns = makeMdns()
    const servicesByName = new Map<string, DiscoveredService>()
    const ipByHost = new Map<string, string>()
    const hostsFromARecords = new Set<string>()

    const scanTimeout = clampTimeout(timeoutMs)

    const finalize = () => {
      try {
        mdns.removeListener('response', onResponse)
      } catch {
        // no-op
      }

      try {
        mdns.destroy()
      } catch {
        // no-op
      }

      const controllersByHost = new Map<string, WledDiscoveredController>()

      for (const [serviceName, service] of servicesByName.entries()) {
        const host = normalizeHost(service.host ?? deriveHostFromServiceName(serviceName))
        if (host.length === 0) {
          continue
        }
        const hostKey = host.toLowerCase()
        const ip =
          service.ip ??
          ipByHost.get(host.toLowerCase()) ??
          ipByHost.get(withoutTrailingDot(host).toLowerCase()) ??
          null
        controllersByHost.set(hostKey, {
          host,
          ip,
          name: humanizeServiceName(serviceName, host),
        })
      }

      for (const hostName of hostsFromARecords) {
        if (!/wled/i.test(hostName)) {
          continue
        }
        const host = normalizeHost(hostName)
        if (host.length === 0) {
          continue
        }
        const hostKey = host.toLowerCase()
        if (!controllersByHost.has(hostKey)) {
          controllersByHost.set(hostKey, {
            host,
            ip: ipByHost.get(host.toLowerCase()) ?? null,
            name: humanizeServiceName(host, host),
          })
        }
      }

      const controllers = Array.from(controllersByHost.values()).sort((a, b) =>
        a.host.localeCompare(b.host)
      )
      resolve(controllers)
    }

    const onResponse = (packet: any) => {
      const answers = Array.isArray(packet?.answers) ? packet.answers : []
      const additionals = Array.isArray(packet?.additionals) ? packet.additionals : []
      const records = [...answers, ...additionals]

      for (const record of records) {
        const type = String(record?.type ?? '')
        const recordName = String(record?.name ?? '').trim()
        const data = record?.data
        if (recordName.length === 0) {
          continue
        }

        if (type === 'PTR' && sameHost(recordName, WLED_SERVICE_NAME)) {
          const serviceName = normalizeHost(String(data ?? ''))
          if (serviceName.length === 0) {
            continue
          }
          if (!servicesByName.has(serviceName)) {
            servicesByName.set(serviceName, {
              serviceName,
              host: null,
              ip: null,
            })
          }
          continue
        }

        if (type === 'SRV') {
          const serviceName = normalizeHost(recordName)
          const existing = servicesByName.get(serviceName)
          if (existing === undefined) {
            continue
          }
          const target = normalizeHost(String(data?.target ?? ''))
          if (target.length > 0) {
            existing.host = target
            const cachedIp = ipByHost.get(target.toLowerCase())
            if (cachedIp !== undefined) {
              existing.ip = cachedIp
            }
          }
          continue
        }

        if (type === 'A') {
          const host = normalizeHost(recordName)
          const ip = normalizeIp(String(data ?? ''))
          if (host.length === 0 || ip === null) {
            continue
          }
          ipByHost.set(host.toLowerCase(), ip)
          hostsFromARecords.add(host)

          for (const service of servicesByName.values()) {
            if (service.host !== null && sameHost(service.host, host)) {
              service.ip = ip
            }
          }
        }
      }
    }

    mdns.addListener('response', onResponse)

    try {
      mdns.query(WLED_SERVICE_NAME, 'PTR')
    } catch (err) {
      console.error('WLED discovery query failed', err)
      finalize()
      return
    }

    setTimeout(finalize, scanTimeout)
  })
}

function normalizeHost(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return ''
  }
  return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed
}

function withoutTrailingDot(value: string): string {
  return value.endsWith('.') ? value.slice(0, -1) : value
}

function sameHost(a: string, b: string): boolean {
  return withoutTrailingDot(a).toLowerCase() === withoutTrailingDot(b).toLowerCase()
}

function humanizeServiceName(serviceName: string, fallbackHost: string): string {
  const normalized = normalizeHost(serviceName)
  const splitOnService = normalized.split('._wled._tcp')
  const candidate = splitOnService[0]?.trim()
  if (candidate && candidate.length > 0) {
    return candidate
  }
  return fallbackHost
}

function deriveHostFromServiceName(serviceName: string): string {
  const normalized = normalizeHost(serviceName)
  const candidate = normalized.split('._wled._tcp')[0]?.trim()
  if (candidate && candidate.length > 0) {
    return `${candidate}.local`
  }
  return ''
}

function normalizeIp(value: string): string | null {
  const trimmed = value.trim()
  const parts = trimmed.split('.')
  if (parts.length !== 4) return null
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const numeric = Number(part)
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 255) {
      return null
    }
  }
  return trimmed
}

function clampTimeout(timeoutMs?: number) {
  if (!Number.isFinite(timeoutMs)) {
    return DEFAULT_TIMEOUT_MS
  }
  return Math.round(Math.max(300, Math.min(MAX_TIMEOUT_MS, Number(timeoutMs))))
}
