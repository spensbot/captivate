import {
  isLegacyProjectFilePath,
  LEGACY_PROJECT_FILE_EXT,
  normalizeProjectSavePath,
  PROJECT_FILE_EXT,
} from './projectFiles'

export interface LegacyProjectMigrationNote {
  fromExtension: string
  toExtension: string
  suggestedSavePath: string
}

/**
 * Detect legacy `.captivate` project paths and suggest a modern `.cap` target.
 * Content format is unchanged — migration is extension + save-location standardization.
 */
export function describeLegacyProjectMigration(
  filePath: string
): LegacyProjectMigrationNote | null {
  if (!isLegacyProjectFilePath(filePath)) {
    return null
  }
  return {
    fromExtension: LEGACY_PROJECT_FILE_EXT,
    toExtension: PROJECT_FILE_EXT,
    suggestedSavePath: normalizeProjectSavePath(filePath),
  }
}
