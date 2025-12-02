import { contextBridge } from 'electron'

console.log('Preload carregado com sucesso!')

contextBridge.exposeInMainWorld('electronAPI', {
  // ping: () => ipcRenderer.invoke('ping')
})