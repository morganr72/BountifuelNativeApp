module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          'api': './src/api',
          'components': './src/components',
          'constants': './src/constants',
          'hooks': './src/hooks',
          'navigation': './src/navigation',
          'screens': './src/screens',
        }
      }
    ],
    // This plugin is required for react-native-reanimated.
    // It MUST be the last plugin in the list.
    'react-native-reanimated/plugin',
  ]
};
