import path from 'path'
import { app } from 'electron'
import { promises as fs } from 'fs'

const FIXTURE_LIBRARY_DIRNAME = 'fixture-library'
const FIXTURE_LIBRARY_FILENAME = 'captivate-fixtures.captivate-fixtures'

export function getDefaultFixtureLibraryPath(): string {
  return path.join(
    app.getPath('userData'),
    FIXTURE_LIBRARY_DIRNAME,
    FIXTURE_LIBRARY_FILENAME
  )
}

export async function readDefaultFixtureLibrary(): Promise<string | null> {
  const filePath = getDefaultFixtureLibraryPath()

  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    throw err
  }
}

export async function saveDefaultFixtureLibrary(
  serializedFixtureLibrary: string
): Promise<string> {
  const filePath = getDefaultFixtureLibraryPath()
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, serializedFixtureLibrary, 'utf8')
  return filePath
}
