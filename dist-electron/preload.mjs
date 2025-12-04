"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getTeams: () => electron.ipcRenderer.invoke("get-teams"),
  getPlayers: (teamId) => electron.ipcRenderer.invoke("get-players", teamId),
  getStaff: (teamId) => electron.ipcRenderer.invoke("get-staff", teamId),
  getMatches: (teamId, seasonId) => electron.ipcRenderer.invoke("get-matches", { teamId, seasonId }),
  getCompetitions: () => electron.ipcRenderer.invoke("get-competitions"),
  updateTrainingFocus: (focus) => electron.ipcRenderer.invoke("update-training-focus", focus),
  getGameState: () => electron.ipcRenderer.invoke("get-game-state"),
  advanceDay: () => electron.ipcRenderer.invoke("advance-day"),
  saveGame: () => electron.ipcRenderer.invoke("save-game"),
  loadGame: () => electron.ipcRenderer.invoke("load-game")
});
