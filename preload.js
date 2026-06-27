const { contextBridge, ipcRenderer } = require('electron');

// Прокидываем безопасное API в окно браузера
contextBridge.exposeInMainWorld('electronAPI', {
    runSearch: (urlsPath,ports,treads,proxy_ip,proxy_port) => ipcRenderer.invoke('runSearch', urlsPath, ports, treads, proxy_ip, proxy_port),
    stopSearch: () => ipcRenderer.invoke('stopSearch'),
    getStats: () => ipcRenderer.invoke('getStats'),
    getResults: () => ipcRenderer.invoke('getResults')
});