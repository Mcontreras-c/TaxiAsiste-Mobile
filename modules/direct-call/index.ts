import { requireNativeModule } from 'expo-modules-core';

interface DirectCallModuleType {
  placeCall(numero: string): boolean;
}

// Solo existe implementacion nativa en Android — en iOS este modulo no se
// compila (ver expo-module.config.json, "platforms": ["android"]). El
// llamador (EmergencyCallOverlay) debe chequear Platform.OS antes de usar esto.
const DirectCallModule = requireNativeModule<DirectCallModuleType>('DirectCallModule');

export function placeCall(numero: string): boolean {
  return DirectCallModule.placeCall(numero);
}
