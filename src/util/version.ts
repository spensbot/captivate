import compareVersions from 'compare-versions'

export const appVersion = process.env.REACT_APP_VERSION

export function comparedToAppVersion(other: string) {
  return appVersion ? compareVersions(appVersion, other) : false
}
