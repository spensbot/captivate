import { SerialPort } from 'serialport'

export interface SetOptions {
  brk?: boolean
  cts?: boolean
  dsr?: boolean
  dtr?: boolean
  rts?: boolean
}

export class SerialConnection {
  private readyToWrite = true
  private connection: SerialPort
  private onData: (data: Buffer) => void = () => {}

  private constructor(connection: SerialPort) {
    this.connection = connection
    this.connection.on('data', (data) => this.onData(data))
    // These don't really need to be used if we check if it's open
    connection.on('disconnect', (_d) => {
      console.log('Serial Disconnect')
    })
    connection.on('error', (e) => {
      console.error('Error', e)
    })
  }

  static async connect(path: string): Promise<SerialConnection> {
    return new Promise((resolve, reject) => {
      let connection = new SerialPort(
        {
          path,
          baudRate: 250000,
          dataBits: 8,
          stopBits: 2,
          parity: 'none',
        },
        (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(new SerialConnection(connection))
          }
        }
      )
    })
  }

  isOpen(): boolean {
    return this.connection.isOpen
  }

  disconnect() {
    this.connection.close()
    this.connection.destroy()
  }

  async set(options: SetOptions, ms: number): Promise<void> {
    return new Promise((resolve, _reject) => {
      this.connection.set(options, (err) => {
        if (err) console.error(err)
        setTimeout(resolve, ms)
      })
    })
  }

  write(buffer: Buffer) {
    if (
      this.connection.isOpen &&
      this.connection.writable &&
      this.readyToWrite
    ) {
      this.readyToWrite = false
      this.connection.write(buffer)
      this.connection.drain(() => {
        this.readyToWrite = true
      })
    }
  }

  writeAndAwaitReply(buffer: Buffer, timeoutMs = 500): Promise<Buffer | null> {
    return new Promise((resolve, _reject) => {
      this.onData = resolve
      this.write(buffer)
      setTimeout(() => {
        resolve(null)
      }, timeoutMs)
    })
  }
}
