module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|react-native-web|react-native-worklets|moti|framer-motion)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^expo-sqlite': '<rootDir>/src/__tests__/mocks/expo-sqlite.ts',
    '^expo-font': '<rootDir>/src/__tests__/mocks/expo-font.ts',
    '^expo-splash-screen': '<rootDir>/src/__tests__/mocks/expo-splash-screen.ts',
    '^expo-status-bar': '<rootDir>/src/__tests__/mocks/expo-status-bar.ts',
    '^expo-constants': '<rootDir>/src/__tests__/mocks/expo-constants.ts',
    '^@expo/vector-icons': '<rootDir>/src/__tests__/mocks/@expo-vector-icons.ts',
    '^@expo-google-fonts/syne': '<rootDir>/src/__tests__/mocks/expo-font.ts',
    '^@expo-google-fonts/outfit': '<rootDir>/src/__tests__/mocks/expo-font.ts',
    '^@expo-google-fonts/roboto-mono': '<rootDir>/src/__tests__/mocks/expo-font.ts',
    '^react-native-gesture-handler': '<rootDir>/src/__tests__/mocks/react-native-gesture-handler.ts',
    '^react-native-reanimated': '<rootDir>/src/__tests__/mocks/react-native-reanimated.ts',
    '^react-native-safe-area-context': '<rootDir>/src/__tests__/mocks/react-native-safe-area-context.ts',
    '^react-native-gifted-charts': '<rootDir>/src/__tests__/mocks/react-native-gifted-charts.ts',
    '^@react-native-community/slider': '<rootDir>/src/__tests__/mocks/react-native-community-slider.ts',
  },
  testMatch: ['**/src/mybody/__tests__/**/*.test.(ts|tsx)', '**/src/__tests__/db/database.test.ts', '**/src/__tests__/db/migrations.test.ts'],
  clearMocks: true,
};
