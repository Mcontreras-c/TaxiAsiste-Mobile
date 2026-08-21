import { NativeModules } from 'react-native';

interface DirectCallModuleType {
  placeCall(numero: string): Promise<boolean>;
}

// Modulo legacy de React Native (no via expo-modules-core) — solo existe
// implementacion nativa en Android. En iOS este modulo no esta registrado;
// el llamador (EmergencyCallOverlay) debe chequear Platform.OS antes de usar esto.
const DirectCallModule: DirectCallModuleType | undefined = NativeModules.DirectCallModule;

export async function placeCall(numero: string): Promise<boolean> {
  if (!DirectCallModule) return false;
  return DirectCallModule.placeCall(numero);
}
