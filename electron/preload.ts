import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getTeams: () => ipcRenderer.invoke('get-teams'),
  getPlayers: (teamId: number) => ipcRenderer.invoke('get-players', teamId),
  getStaff: (teamId: number) => ipcRenderer.invoke('get-staff', teamId),
  getMatches: (teamId: number, seasonId: number) => ipcRenderer.invoke('get-matches', { teamId, seasonId }),
  getCompetitions: () => ipcRenderer.invoke('get-competitions'),
  getGameState: () => ipcRenderer.invoke('get-game-state'),
  advanceDay: () => ipcRenderer.invoke('advance-day'),
  saveGame: () => ipcRenderer.invoke('save-game'),
  loadGame: () => ipcRenderer.invoke('load-game'),
})