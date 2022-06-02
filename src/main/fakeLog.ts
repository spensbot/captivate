import { dialog } from 'electron';

export default function fakeLog(s: string) {
  dialog.showErrorBox(s, '');
}
