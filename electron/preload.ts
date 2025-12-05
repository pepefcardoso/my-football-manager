import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getTeams: () => ipcRenderer.invoke("get-teams"),
  getPlayers: (teamId: number) => ipcRenderer.invoke("get-players", teamId),
  getStaff: (teamId: number) => ipcRenderer.invoke("get-staff", teamId),
  getMatches: (teamId: number, seasonId: number) =>
    ipcRenderer.invoke("get-matches", { teamId, seasonId }),
  getCompetitions: () => ipcRenderer.invoke("get-competitions"),
  updateTrainingFocus: (focus: string) =>
    ipcRenderer.invoke("update-training-focus", focus),
  getGameState: () => ipcRenderer.invoke("get-game-state"),
  advanceDay: () => ipcRenderer.invoke("advance-day"),
  saveGame: () => ipcRenderer.invoke("save-game"),
  loadGame: () => ipcRenderer.invoke("load-game"),
  startMatch: (matchId: number) => ipcRenderer.invoke("start-match", matchId),
  pauseMatch: (matchId: number) => ipcRenderer.invoke("pause-match", matchId),
  resumeMatch: (matchId: number) => ipcRenderer.invoke("resume-match", matchId),
  simulateMatchMinute: (matchId: number) =>
    ipcRenderer.invoke("simulate-match-minute", matchId),
  simulateFullMatch: (matchId: number) =>
    ipcRenderer.invoke("simulate-full-match", matchId),
  getMatchState: (matchId: number) =>
    ipcRenderer.invoke("get-match-state", matchId),
  simulateMatchesOfDate: (date: string) =>
    ipcRenderer.invoke("simulate-matches-of-date", date),
  getFinancialRecords: (teamId: number, seasonId: number) =>
    ipcRenderer.invoke("get-financial-records", { teamId, seasonId }),
  getFinancialHealth: (teamId: number) =>
    ipcRenderer.invoke("get-financial-health", teamId),
  upgradeInfrastructure: (action: string, teamId: number, seasonId: number) =>
    ipcRenderer.invoke("upgrade-infrastructure", { action, teamId, seasonId }),
  getScoutedPlayer: (playerId: number, teamId: number) =>
    ipcRenderer.invoke("get-scouted-player", { playerId, teamId }),
  getScoutingList: (teamId: number) =>
    ipcRenderer.invoke("get-scouting-list", teamId),
  assignScout: (scoutId: number, playerId: number) =>
    ipcRenderer.invoke("assign-scout", { scoutId, playerId }),
});
