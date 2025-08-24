import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './navo/web/app.ts', // Your main application entry point
  module: {
    rules: [
      {
        test: /\.ts$/, // Apply ts-loader to .ts files
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'], // Resolve .ts and .js extensions
  },
  output: {
    filename: 'app.js', // Output bundle file name
    path: path.resolve(__dirname, 'dist/web'), // Output directory
  },
};