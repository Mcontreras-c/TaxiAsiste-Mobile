import { registerRootComponent } from 'expo';

// Debe importarse ANTES de registrar la app: TaskManager.defineTask()
// tiene que ejecutarse en el scope global apenas arranca el proceso, no
// dentro de un componente, para que la tarea siga viva con la app en
// segundo plano (ver src/tasks/ubicacionTask.ts).
import './src/tasks/ubicacionTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
