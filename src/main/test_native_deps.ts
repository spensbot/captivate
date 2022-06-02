import { SerialPort } from 'serialport';
//@ts-ignore
import midi from 'midi';

export default function doStuff() {
  SerialPort.list().then((ports) =>
    console.log(
      ports.reduce(
        (acc, port) => `${acc}: ${port.manufacturer}`,
        '\n\nSERIAL PORTS:'
      )
    )
  );

  const input = new midi.Input();

  // Count the available input ports.
  console.log(`\n\nNUM MIDI PORTS:${input.getPortCount()}`);
}
