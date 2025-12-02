import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getTeams: () => ipcRenderer.invoke('get-teams'),
})