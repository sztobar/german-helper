const path = require('path');
const cssNext = require('postcss-cssnext');
const postcssImport = require('postcss-import');
const postcssNested = require('postcss-nested');

module.exports = {
  context: path.resolve(__dirname, 'src'),
  entry: './main.ts',
  output: {
    path: path.resolve(__dirname, 'src'),
    filename: 'main.js'
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loaders: ['ts-loader']
      },
      {
        test:   /\.css$/,
        loader: 'style-loader!css-loader!postcss-loader'
      }
    ],
  },
  postcss(webpack) {
    return [
      postcssImport({addDependencyTo: webpack}),
      postcssNested(),
      cssNext()
    ];
  },
  resolve: {
    root: path.resolve(__dirname, 'src'),
    extensions: ['', '.ts', '.js']
  },
  devtool: 'source-map'
};
