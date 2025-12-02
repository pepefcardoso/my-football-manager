"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getTeams: () => electron.ipcRenderer.invoke("get-teams")
});
