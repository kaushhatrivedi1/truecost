const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    content: './src/content.js',
    background: './src/background.js',
    popup: './src/popup/popup.js',
    'dashboard-bridge': './src/dashboard-bridge.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: (pathData) => {
      if (pathData.chunk.name === 'popup') return 'popup/popup.js';
      return '[name].js';
    },
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'assets/trace-icon.svg', to: 'assets/trace-icon.svg' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' },
        { from: 'src/popup/trace-mark.svg', to: 'popup/trace-mark.svg' },
        { from: 'src/overlay/overlay.css', to: 'overlay.css' },
      ],
    }),
  ],
  resolve: {
    fallback: {
      fs: false,
      path: false,
    },
  },
};
