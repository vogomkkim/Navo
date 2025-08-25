import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    entry: './navo/web/app.ts',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'navo'),
      },
    },
    output: {
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      path: path.resolve(__dirname, 'dist/web'),
      clean: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './navo/web/index.html',
        filename: 'index.html',
        inject: 'body',
        scriptLoading: 'module',
        templateParameters: {
          API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
        },
      }),
      new webpack.DefinePlugin({
        __API_URL__: JSON.stringify(
          process.env.API_BASE_URL || 'http://localhost:3000'
        ),
      }),
    ],
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    optimization: {
      minimize: isProduction,
      splitChunks: isProduction
        ? {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                filename: '[name].[contenthash].js',
              },
            },
          }
        : false,
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
    },
  };
};
