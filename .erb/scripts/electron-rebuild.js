import fs from 'fs';
import { dependencies } from '../../release/app/package.json';
import webpackPaths from '../configs/webpack.paths';
import { rebuild } from '@electron/rebuild';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const electronPackage = require('../../node_modules/electron/package.json');

async function run() {
  // MSBuild occasionally crashes (0xC0000005) under high /m parallelism; serial builds are slower but stable.
  if (process.platform === 'win32' && process.env.JOBS === undefined) {
    process.env.JOBS = '1';
  }
  // Separate from /m: cl.exe /MP can still parallelize within a project; that also triggers 3221225477 on some setups.
  if (process.platform === 'win32' && process.env.CL === undefined) {
    process.env.CL = '/MP1';
  }
  if (
    Object.keys(dependencies || {}).length <= 0 ||
    !fs.existsSync(webpackPaths.appNodeModulesPath)
  ) {
    return;
  }

  await rebuild({
    buildPath: webpackPaths.appPath,
    electronVersion: electronPackage.version,
    force: true,
    types: ['prod', 'dev', 'optional'],
    mode: 'sequential',
  });
}

run().catch((error) => {
  const message =
    error instanceof Error ? error.message : String(error);
  console.error(`electron rebuild failed: ${message}`);
  process.exit(1);
});
