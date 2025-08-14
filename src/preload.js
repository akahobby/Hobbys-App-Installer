const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  envCheck: () => ipcRenderer.invoke('env:check'),
  listInstalled: () => ipcRenderer.invoke('installed:list'),
  chocoInstall: (id) => ipcRenderer.invoke('install:choco', id),
  wingetInstall: (spec) => ipcRenderer.invoke('install:winget', spec),
  openAppInstaller: () => ipcRenderer.invoke('open:appinstaller')
});

// --- SAFE HOBBY API (added) ---
try {
  const { contextBridge, shell, ipcRenderer } = require('electron');
  const api = {
    openUrl: async (u) => { try { await shell.openExternal(String(u)); } catch {} },
    installViaUrl: async (u) => { try { await shell.openExternal(String(u)); } catch {} },
    openFolder: async (p) => { try { await shell.openPath(String(p)); } catch {} },
    ping: () => { try { return ipcRenderer.invoke('ping'); } catch { return Promise.resolve(); } }
  };
  contextBridge.exposeInMainWorld('hobby', api);
} catch {}
// --- END SAFE HOBBY API ---
