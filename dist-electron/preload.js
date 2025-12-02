"use strict";
const electron = require("electron");
console.log("Preload carregado com sucesso!");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // ping: () => ipcRenderer.invoke('ping')
});
