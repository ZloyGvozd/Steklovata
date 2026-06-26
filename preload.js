const { contextBridge, ipcRenderer } = require('electron');

// Прокидываем безопасное API в окно браузера
contextBridge.exposeInMainWorld('electronAPI', {
    runSearch: (urlsPath,ports,treads) => ipcRenderer.invoke('runSearch', urlsPath, ports, treads)
});