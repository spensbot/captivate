import path from 'path'
import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import { merge } from 'webpack-merge'
import TerserPlugin from 'terser-webpack-plugin'
import baseConfig from './webpack.config.base'
import webpackPaths from './webpack.paths'
import checkNodeEnv from '../scripts/check-node-env'
import deleteSourceMaps from '../scripts/delete-source-maps'

checkNodeEnv('production')
deleteSourceMaps()

const configuration: webpack.Configuration = {
  mode: 'production',
  target: 'web',
  entry: [path.join(webpackPaths.srcRemotePath, 'index.tsx')],
  output: {
    path: webpackPaths.distRemotePath,
    publicPath: './',
    filename: 'remote.js',
    // Do not inherit commonjs2 from webpack.config.base — browser <script> must self-execute.
    library: undefined,
  },
  // Bundle app deps for the browser; baseConfig externals are for Electron main/renderer.
  externals: {},
  module: {
    rules: [
      {
        test: /\.s?(a|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
            },
          },
          'sass-loader',
        ],
        include: /\.module\.s?(c|a)ss$/,
      },
      {
        test: /\.s?(a|c)ss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        exclude: /\.module\.s?(c|a)ss$/,
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(frag|vert|db|txt)$/i,
        use: 'raw-loader',
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ parallel: true }), new CssMinimizerPlugin()],
    splitChunks: {
      chunks: 'async',
    },
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
      CAPTIVATE_REMOTE_CLIENT: 'true',
    }),
    new MiniCssExtractPlugin({ filename: 'style.css' }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(webpackPaths.srcRemotePath, 'index.ejs'),
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
      isBrowser: true,
      isDevelopment: false,
    }),
  ],
  resolve: {
    fallback: {
      path: require.resolve('path-browserify'),
    },
  },
}

const merged = merge(baseConfig, configuration)
if (merged.output && 'library' in merged.output) {
  delete merged.output.library
}
export default merged
