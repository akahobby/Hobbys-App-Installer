const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  envCheck: () => ipcRenderer.invoke('env:check'),
  listInstalled: () => ipcRenderer.invoke('installed:list'),
  chocoInstall: (id) => ipcRenderer.invoke('install:choco', id),
  wingetInstall: (spec) => ipcRenderer.invoke('install:winget', spec),
  // non-streaming (returns only when finished)
  wingetUpgradeAll: () => ipcRenderer.invoke('winget:upgradeAll'),
  // streaming (live output)
  wingetUpgradeAllStream: () => ipcRenderer.send('winget:upgradeAll:stream'),
  onWingetUpgradeOutput: (cb) => {
    const handler = (_e, chunk) => { try { cb(String(chunk)); } catch {} };
    ipcRenderer.on('winget:upgradeAll:output', handler);
    return () => { try { ipcRenderer.removeListener('winget:upgradeAll:output', handler); } catch {} };
  },
  onWingetUpgradeDone: (cb) => {
    const handler = (_e, payload) => { try { cb(payload); } catch {} };
    ipcRenderer.on('winget:upgradeAll:done', handler);
    return () => { try { ipcRenderer.removeListener('winget:upgradeAll:done', handler); } catch {} };
  },
  wingetShow: (id, source) => ipcRenderer.invoke('winget:show', { id, source }),
  chocoInfo: (id) => ipcRenderer.invoke('choco:info', { id }),
  ensureChoco: () => ipcRenderer.invoke('choco:ensure'),
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
