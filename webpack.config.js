import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';

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
      filename: isProduction ? '[name].[contenthash].js' : 'app.js',
      path: path.resolve(__dirname, 'dist/web'),
      clean: true,
    },
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'dist/web'),
      },
      port: 8080,
      historyApiFallback: true,
      hot: true, // 핫 리로드 활성화
      liveReload: true, // 라이브 리로드 활성화
      watchFiles: {
        paths: ['navo/**/*'], // 전체 navo 폴더 감시 (서버 + 프론트엔드)
        options: {
          usePolling: false, // Windows에서 더 안정적
        },
      },
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:3000',
        },
      ],
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
      new HtmlWebpackPlugin({
        template: './navo/web/login.html',
        filename: 'login.html',
        inject: false, // Login page has its own script
      }),
      new CopyWebpackPlugin({
        patterns: [{ from: './navo/web/styles.css', to: 'styles.css' }],
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
