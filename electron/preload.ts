import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  saveGame: (filename: string, data: string) =>
    ipcRenderer.invoke("save-game", filename, data),
  loadGame: (filename: string) => ipcRenderer.invoke("load-game", filename),
  listSaves: () => ipcRenderer.invoke("list-saves"),
});
