// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      // JavaScript/JSX files
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules\/(?!(react-native-vector-icons|react-native-paper)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: ['react-native-web']
          }
        },
      },
      // TypeScript files
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      // Image files
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
      // Font files
      {
        test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }
        ]
      },
      // Handle TypeScript type exports (ignore them)
      {
        test: /\.ts$/,
        enforce: 'pre',
        use: [
          {
            loader: 'ignore-loader',
            options: {
              include: [/export type/]
            }
          }
        ]
      }
    ],
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-vector-icons': 'react-native-vector-icons/dist',
      '@react-native-vector-icons/material-design-icons': 'react-native-vector-icons/MaterialIcons',
      'react-native-vector-icons/MaterialCommunityIcons': 'react-native-vector-icons/dist/MaterialCommunityIcons',
    },
    extensions: ['.web.js', '.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      'react-native-vector-icons/MaterialCommunityIcons': false,
      '@react-native/vector-icons/material-design-icons': false,
      '@react-native-vector-icons/material-design-icons': false,
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new webpack.DefinePlugin({
      __DEV__: process.env.NODE_ENV !== 'production',
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'public'),
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
};