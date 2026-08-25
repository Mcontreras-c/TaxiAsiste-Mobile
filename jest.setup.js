// Mock oficial de AsyncStorage para tests (memoria en vez de disco nativo) —
// sin esto, cualquier modulo que importe AsyncStorage revienta en Jest con
// "NativeModule: AsyncStorage is null".
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
