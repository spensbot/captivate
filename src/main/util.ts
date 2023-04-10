/* eslint import/prefer-default-export: off, import/no-mutable-exports: off */
import { URL } from 'url'
import path from 'path'

export let resolveHtmlPath: (
  folder: 'renderer' | 'visualizer',
  htmlFileName: string
) => string

if (process.env.NODE_ENV === 'development') {
  const port = process.env.PORT || 1212
  resolveHtmlPath = (_folder, htmlFileName: string) => {
    const url = new URL(`http://localhost:${port}`)
    url.pathname = htmlFileName
    return url.href
  }
} else {
  resolveHtmlPath = (folder, htmlFileName: string) => {
    return `file://${path.resolve(__dirname, `../${folder}/`, htmlFileName)}`
  }
}
