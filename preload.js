const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getApps: () => ipcRenderer.invoke('get-apps'),
  checkCli: () => ipcRenderer.invoke('check-cli'),
  getInstallRecord: () => ipcRenderer.invoke('get-install-record'),
  installApps: (apps) => ipcRenderer.invoke('install-apps', apps),
  upgradeAll: () => ipcRenderer.invoke('upgrade-all'),
  onTerminalData: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('terminal-data', handler);
    return () => ipcRenderer.removeListener('terminal-data', handler);
  }
});
