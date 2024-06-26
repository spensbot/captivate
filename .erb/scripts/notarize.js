const { notarize } = require('electron-notarize')
const { build } = require('../../package.json')

exports.default = async function notarizeMacos(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  if (process.env.CI !== 'true') {
    console.warn('Skipping notarizing step. Packaging is not running in CI')
    return
  }

  if (!('APPLE_ID' in process.env && 'APPLE_ID_PASS' in process.env)) {
    console.warn(
      'Skipping notarizing step. APPLE_ID and APPLE_ID_PASS env variables must be set'
    )
    return
  }

  const appName = context.packager.appInfo.productFilename

  await notarize({
    appBundleId: build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    // appleApiIssuer: process.env.APPLE_API_ISSUER,
    // appleApiKeyId: process.env.APPLE_API_KEY_ID,
    // appleApiKey: process.env.APPLE_API_KEY,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASS,
    tool: 'notarytool',
    teamId: 'B78D2A6G55',
  })
}
