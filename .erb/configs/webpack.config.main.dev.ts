/**
 * Webpack config for development electron main process (watch-friendly).
 */
import path from 'path'
import webpack from 'webpack'
import { merge } from 'webpack-merge'
import baseConfig from './webpack.config.base'
import webpackPaths from './webpack.paths'
import checkNodeEnv from '../scripts/check-node-env'

checkNodeEnv('development')

const configuration: webpack.Configuration = {
  mode: 'development',
  devtool: 'inline-source-map',
  target: 'electron-main',
  entry: {
    main: path.join(webpackPaths.srcMainPath, 'main.ts'),
    preload: path.join(webpackPaths.srcMainPath, 'preload.js'),
    visualizer_preload: path.join(
      webpackPaths.srcMainPath,
      'engine',
      'visualizer_preload.js'
    ),
    lighting3dPreviewWorker: path.join(
      webpackPaths.srcMainPath,
      'workers',
      'lighting3dPreviewWorker.ts'
    ),
  },
  output: {
    path: webpackPaths.distMainPath,
    filename: '[name].js',
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
      DEBUG_PROD: false,
      START_MINIMIZED: false,
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
}

export default merge(baseConfig, configuration)
