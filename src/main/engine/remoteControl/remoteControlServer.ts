import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { WebSocketServer, WebSocket } from 'ws'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { CleanReduxState } from '../../../renderer/redux/store'
import type { RealtimeState } from '../../../renderer/redux/realtimeStore'
import type { DmxConnectionInfo, MidiConnections } from '../../../shared/connection'
import type { UserCommand } from '../../../shared/ipc_channels'
import {
  clampRemotePort,
  isRemoteDispatchAllowed,
  isRemoteUserCommandAllowed,
  type RemoteClientMessage,
  type RemoteControlRuntimeStatus,
  type RemoteControlSettings,
  type RemoteServerMessage,
} from '../../../shared/remoteControl'

export type RemoteControlBridge = {
  broadcastDispatch: (action: PayloadAction<unknown>) => void
  broadcastUserCommand: (command: UserCommand) => void
  getControlState: () => CleanReduxState | null
}

type Client = {
  socket: WebSocket
  authenticated: boolean
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

function listLanUrls(port: number): string[] {
  const urls: string[] = [`http://127.0.0.1:${port}`]
  const ifaces = os.networkInterfaces()
  for (const entries of Object.values(ifaces)) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      urls.push(`http://${entry.address}:${port}`)
    }
  }
  return [...new Set(urls)]
}

function resolveStaticRoot(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'release/app/dist/remote')
  }
  return path.join(__dirname, '../../remote')
}

function safeStaticPath(root: string, urlPath: string): string | null {
  const rel = urlPath === '/' ? '/index.html' : urlPath.split('?')[0] ?? '/'
  const resolved = path.normalize(path.join(root, rel))
  if (!resolved.startsWith(path.normalize(root))) return null
  return resolved
}

export class RemoteControlServer {
  private httpServer: http.Server | null = null
  private wss: WebSocketServer | null = null
  private clients = new Set<Client>()
  private settings: RemoteControlSettings
  private bridge: RemoteControlBridge
  private staticRoot: string
  private lastError: string | undefined
  private lastTimeStateSentMs = 0
  private readonly timeStateMinIntervalMs = 33

  constructor(settings: RemoteControlSettings, bridge: RemoteControlBridge) {
    this.settings = {
      ...settings,
      port: clampRemotePort(settings.port),
    }
    this.bridge = bridge
    this.staticRoot = resolveStaticRoot()
  }

  getStatus(): RemoteControlRuntimeStatus {
    return {
      running: this.httpServer !== null,
      enabled: this.settings.enabled,
      port: this.settings.port,
      pin: this.settings.pin,
      clientCount: [...this.clients].filter((c) => c.authenticated).length,
      urls: this.httpServer ? listLanUrls(this.settings.port) : [],
      lastError: this.lastError,
    }
  }

  updateSettings(settings: RemoteControlSettings): void {
    this.settings = {
      ...settings,
      port: clampRemotePort(settings.port),
    }
  }

  async start(): Promise<RemoteControlRuntimeStatus> {
    await this.stop()
    this.lastError = undefined
    const root = this.staticRoot
    if (!fs.existsSync(root)) {
      this.lastError = `Remote UI not built (${root}). Run npm run build:remote.`
      return this.getStatus()
    }

    const server = http.createServer((req, res) => {
      const urlPath = req.url ?? '/'
      const filePath = safeStaticPath(root, urlPath)
      if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const indexPath = path.join(root, 'index.html')
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          fs.createReadStream(indexPath).pipe(res)
        } else {
          res.writeHead(404)
          res.end('Not found')
        }
        return
      }
      const ext = path.extname(filePath)
      res.writeHead(200, {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      fs.createReadStream(filePath).pipe(res)
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(this.settings.port, '0.0.0.0', () => resolve())
    })

    const wss = new WebSocketServer({ server })
    wss.on('connection', (socket) => this.onConnection(socket))
    wss.on('error', (err) => {
      this.lastError = err instanceof Error ? err.message : String(err)
    })

    this.httpServer = server
    this.wss = wss
    this.broadcastStatus()
    return this.getStatus()
  }

  async stop(): Promise<void> {
    for (const client of [...this.clients]) {
      try {
        client.socket.close()
      } catch {
        /* ignore */
      }
    }
    this.clients.clear()
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss?.close(() => resolve())
      })
      this.wss = null
    }
    if (this.httpServer) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer?.close((err) => (err ? reject(err) : resolve()))
      })
      this.httpServer = null
    }
  }

  broadcastControlState(state: CleanReduxState): void {
    this.sendToAuthenticated({ type: 'control_state', state })
  }

  broadcastTimeState(state: RealtimeState): void {
    const now = Date.now()
    if (now - this.lastTimeStateSentMs < this.timeStateMinIntervalMs) return
    this.lastTimeStateSentMs = now
    this.sendToAuthenticated({ type: 'time_state', state })
  }

  broadcastDmxConnection(payload: DmxConnectionInfo): void {
    this.sendToAuthenticated({ type: 'dmx_connection_update', payload })
  }

  broadcastMidiConnection(payload: MidiConnections): void {
    this.sendToAuthenticated({ type: 'midi_connection_update', payload })
  }

  broadcastDispatch(action: PayloadAction<unknown>): void {
    this.sendToAuthenticated({ type: 'dispatch', action })
  }

  private onConnection(socket: WebSocket): void {
    const client: Client = { socket, authenticated: false }
    this.clients.add(client)
    socket.on('message', (data) => {
      try {
        const text = typeof data === 'string' ? data : data.toString('utf8')
        const msg = JSON.parse(text) as RemoteClientMessage
        this.onClientMessage(client, msg)
      } catch {
        socket.close(1003, 'Invalid message')
      }
    })
    socket.on('close', () => {
      this.clients.delete(client)
      this.broadcastStatus()
    })
    this.send(client, { type: 'status', status: this.getStatus() })
  }

  private onClientMessage(client: Client, msg: RemoteClientMessage): void {
    if (!client.authenticated) {
      if (msg.type !== 'auth') {
        this.send(client, { type: 'auth_fail', message: 'Authenticate first.' })
        return
      }
      if (msg.pin !== this.settings.pin) {
        this.send(client, { type: 'auth_fail', message: 'Invalid PIN.' })
        return
      }
      client.authenticated = true
      this.send(client, { type: 'auth_ok' })
      const snapshot = this.bridge.getControlState()
      if (snapshot) {
        this.send(client, { type: 'control_state', state: snapshot })
      }
      this.broadcastStatus()
      return
    }

    switch (msg.type) {
      case 'ping':
        this.send(client, { type: 'pong' })
        break
      case 'dispatch':
        if (isRemoteDispatchAllowed(msg.action)) {
          this.bridge.broadcastDispatch(msg.action as PayloadAction<unknown>)
        }
        break
      case 'user_command':
        if (isRemoteUserCommandAllowed(msg.command)) {
          this.bridge.broadcastUserCommand(msg.command)
        }
        break
      default:
        break
    }
  }

  private send(client: Client, message: RemoteServerMessage): void {
    if (client.socket.readyState !== WebSocket.OPEN) return
    try {
      client.socket.send(JSON.stringify(message))
    } catch {
      /* ignore */
    }
  }

  private sendToAuthenticated(message: RemoteServerMessage): void {
    for (const client of this.clients) {
      if (!client.authenticated) continue
      this.send(client, message)
    }
  }

  private broadcastStatus(): void {
    const status = this.getStatus()
    for (const client of this.clients) {
      this.send(client, { type: 'status', status })
    }
  }
}
