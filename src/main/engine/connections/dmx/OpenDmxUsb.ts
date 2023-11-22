import { SerialConnection } from '../SerialConnection'

export async function sendUniverse(
  universe: number[],
  connection: SerialConnection
) {
  const universeBuffer = Buffer.alloc(513, 0)

  universe.forEach((value, index) => (universeBuffer[index + 1] = value))

  let buffer = universeBuffer

  await connection.set({ brk: true, rts: false }, 1)
  await connection.set({ brk: false, rts: false }, 1)
  connection.write(buffer)
}
