const { app, BrowserWindow, ipcMain, nativeTheme, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow;

function sendTerminal(chunk) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal-data', chunk);
  }
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      env: { ...process.env, ...options.env },
      ...options
    });

    const onData = (buf, stream) => {
      const text = buf.toString();
      if (text) {
        sendTerminal({ stream, text });
      }
    };

    child.stdout?.on('data', (d) => onData(d, 'stdout'));
    child.stderr?.on('data', (d) => onData(d, 'stderr'));

    child.on('error', (err) => {
      sendTerminal({ stream: 'stderr', text: `${err.message}\r\n` });
      resolve(1);
    });

    child.on('close', (code) => resolve(code ?? 1));
  });
}

function whereExists(exe) {
  return new Promise((resolve) => {
    const child = spawn('where.exe', [exe], { windowsHide: true, shell: false });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function getInstallRecordPath() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged && portableDir) {
    return path.join(portableDir, 'installed-packages.json');
  }
  return path.join(app.getPath('userData'), 'installed-packages.json');
}

function readInstallRecordIds() {
  try {
    const p = getInstallRecordPath();
    if (!fs.existsSync(p)) return new Set();
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    const ids = Array.isArray(data.ids) ? data.ids : [];
    return new Set(ids.map((x) => String(x)));
  } catch {
    return new Set();
  }
}

function saveInstallRecordIds(set) {
  try {
    const p = getInstallRecordPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      JSON.stringify(
        {
          ids: [...set].sort(),
          updatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (err) {
    sendTerminal({
      stream: 'stderr',
      text: `[Install record] Could not save: ${err.message || err}\r\n`
    });
  }
}

function markInstalledByThisApp(appId) {
  const set = readInstallRecordIds();
  set.add(String(appId));
  saveInstallRecordIds(set);
}

function getInstallRecordStatusMap() {
  const apps = readAppsCatalog();
  const recorded = readInstallRecordIds();
  /** @type {Record<string, { installed: boolean | null, via: string | null }>} */
  const result = {};
  for (const a of apps) {
    if (recorded.has(a.id)) {
      result[a.id] = { installed: true, via: 'app' };
    } else {
      result[a.id] = { installed: null, via: null };
    }
  }
  return result;
}

function getCatalogPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, 'apps.json');
  }
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    const sidecar = path.join(portableDir, 'apps.json');
    if (fs.existsSync(sidecar)) {
      return sidecar;
    }
  }
  return path.join(process.resourcesPath, 'apps.json');
}

function readAppsCatalog() {
  const catalogPath = getCatalogPath();
  const raw = fs.readFileSync(catalogPath, 'utf8');
  return JSON.parse(raw);
}

function buildWingetInstallArgs(app) {
  const source = app.wingetSource || 'winget';
  const base = [
    'install',
    '--id',
    app.wingetId,
    '-e',
    '--silent',
    '--accept-package-agreements',
    '--accept-source-agreements'
  ];
  if (source === 'msstore') {
    return ['install', '--source', 'msstore', '--id', app.wingetId, '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements'];
  }
  return base;
}

function findExeInDir(dir, exeContains) {
  const matches = [];
  function walk(d) {
    let entries;
    try {
      entries = fs.readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(d, name);
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (name.toLowerCase().endsWith('.exe')) {
        matches.push(full);
      }
    }
  }
  walk(dir);
  if (!matches.length) return null;
  if (exeContains) {
    const needle = exeContains.toLowerCase();
    const filtered = matches.filter((p) => path.basename(p).toLowerCase().includes(needle));
    if (filtered.length) {
      return filtered.sort((a, b) => a.length - b.length)[0];
    }
  }
  return matches.sort((a, b) => a.length - b.length)[0];
}

async function downloadToFile(url, destFile) {
  let code = await runProcess('curl.exe', ['-fL', url, '-o', destFile]);
  if (code === 0) return true;
  sendTerminal({
    stream: 'stdout',
    text: '[Direct] curl unavailable or failed; trying PowerShell download...\r\n'
  });
  const u = url.replace(/'/g, "''");
  const out = destFile.replace(/'/g, "''");
  code = await runProcess('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `Invoke-WebRequest -Uri '${u}' -OutFile '${out}'`
  ]);
  return code === 0;
}

function fileBaseFromUrl(urlString) {
  try {
    return path.basename(new URL(urlString).pathname) || 'setup.exe';
  } catch {
    return 'setup.exe';
  }
}

async function resolveDirectDownloadUrl(dd) {
  if (dd.githubLatest) {
    const gl = dd.githubLatest;
    const { owner, repo, assetContains } = gl;
    if (!owner || !repo || !assetContains) {
      sendTerminal({
        stream: 'stderr',
        text: '[Direct] githubLatest requires owner, repo, and assetContains.\r\n'
      });
      return null;
    }
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`;
    sendTerminal({
      stream: 'stdout',
      text: `[Direct] Resolving latest GitHub release (${owner}/${repo})...\r\n`
    });
    try {
      const res = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'bulk-app-installer'
        }
      });
      if (!res.ok) {
        sendTerminal({
          stream: 'stderr',
          text: `[Direct] GitHub API HTTP ${res.status}\r\n`
        });
        return null;
      }
      const data = await res.json();
      const tag = data.tag_name || data.name || '?';
      const assets = Array.isArray(data.assets) ? data.assets : [];
      const needle = String(assetContains).toLowerCase();
      const match = assets.find(
        (a) => a && a.name && String(a.name).toLowerCase().includes(needle)
      );
      if (!match?.browser_download_url) {
        sendTerminal({
          stream: 'stderr',
          text: `[Direct] No asset matching “${assetContains}” in ${tag}.\r\n`
        });
        return null;
      }
      sendTerminal({
        stream: 'stdout',
        text: `[Direct] Latest release ${tag} → ${match.name}\r\n`
      });
      return match.browser_download_url;
    } catch (err) {
      sendTerminal({
        stream: 'stderr',
        text: `[Direct] ${err.message || String(err)}\r\n`
      });
      return null;
    }
  }
  if (dd.url) return dd.url;
  sendTerminal({
    stream: 'stderr',
    text: '[Direct] Set url or githubLatest on the entry.\r\n'
  });
  return null;
}

async function installDirectDownload(app) {
  const dd = app.directDownload;
  if (!dd || !dd.kind) {
    sendTerminal({ stream: 'stderr', text: '[Direct] Invalid directDownload entry.\r\n' });
    return false;
  }

  const resolvedUrl = await resolveDirectDownloadUrl(dd);
  if (!resolvedUrl) return false;

  const tmp = path.join(os.tmpdir(), `bai-dd-${app.id}-${Date.now()}`);
  try {
    fs.mkdirSync(tmp, { recursive: true });
    const exeBase = fileBaseFromUrl(resolvedUrl);
    const destFile = dd.kind === 'zip' ? path.join(tmp, 'download.zip') : path.join(tmp, exeBase);

    sendTerminal({ stream: 'stdout', text: `[Direct] Downloading ${app.name}...\r\n` });
    const okDl = await downloadToFile(resolvedUrl, destFile);
    if (!okDl) {
      sendTerminal({ stream: 'stderr', text: '[Direct] Download failed.\r\n' });
      return false;
    }

    if (dd.kind === 'exe') {
      const args = Array.isArray(dd.silentArgs) ? dd.silentArgs : [];
      sendTerminal({ stream: 'stdout', text: `[Direct] Running ${path.basename(destFile)}...\r\n` });
      const code = await runProcess(destFile, args);
      if (code === 0) {
        sendTerminal({ stream: 'stdout', text: `[OK] Direct install finished for ${app.name}\r\n` });
      }
      return code === 0;
    }

    if (dd.kind === 'zip') {
      const extractDir = path.join(tmp, 'extract');
      fs.mkdirSync(extractDir, { recursive: true });
      const lit = destFile.replace(/'/g, "''");
      const ex = extractDir.replace(/'/g, "''");
      const ps = `Expand-Archive -LiteralPath '${lit}' -DestinationPath '${ex}' -Force`;
      sendTerminal({ stream: 'stdout', text: `[Direct] Extracting archive...\r\n` });
      const unzip = await runProcess('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        ps
      ]);
      if (unzip !== 0) {
        sendTerminal({ stream: 'stderr', text: '[Direct] Extraction failed.\r\n' });
        return false;
      }
      const exePath = findExeInDir(extractDir, dd.exeContains || '');
      if (!exePath) {
        sendTerminal({ stream: 'stderr', text: '[Direct] No .exe found in archive.\r\n' });
        return false;
      }
      const args = Array.isArray(dd.silentArgs) ? dd.silentArgs : [];
      sendTerminal({ stream: 'stdout', text: `[Direct] Running ${path.basename(exePath)}...\r\n` });
      const code = await runProcess(exePath, args);
      if (code === 0) {
        sendTerminal({ stream: 'stdout', text: `[OK] Direct install finished for ${app.name}\r\n` });
      }
      return code === 0;
    }

    sendTerminal({ stream: 'stderr', text: '[Direct] Unsupported kind (use zip or exe).\r\n' });
    return false;
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

async function installOneApp(app, chocoAvailable) {
  sendTerminal({
    stream: 'stdout',
    text: `\r\n========== ${app.name} ==========\r\n`
  });

  if (app.directDownload) {
    return installDirectDownload(app);
  }

  if (!app.wingetId && !app.chocoId) {
    sendTerminal({
      stream: 'stderr',
      text: `[Skip] ${app.name} has no WinGet id, Chocolatey id, or direct download.\r\n`
    });
    return false;
  }

  let wingetOk = false;
  if (app.wingetId) {
    sendTerminal({ stream: 'stdout', text: `> winget ${buildWingetInstallArgs(app).join(' ')}\r\n` });
    const code = await runProcess('winget.exe', buildWingetInstallArgs(app));
    wingetOk = code === 0;
    if (wingetOk) {
      sendTerminal({ stream: 'stdout', text: `[OK] WinGet finished for ${app.name} (exit ${code})\r\n` });
      return true;
    }
    sendTerminal({
      stream: 'stderr',
      text: `[WinGet] ${app.name} failed (exit ${code}). Trying fallback if available...\r\n`
    });
  }

  if (app.chocoId && chocoAvailable) {
    sendTerminal({ stream: 'stdout', text: `> choco install ${app.chocoId} -y\r\n` });
    const chocoCode = await runProcess('choco.exe', ['install', app.chocoId, '-y']);
    if (chocoCode === 0) {
      sendTerminal({ stream: 'stdout', text: `[OK] Chocolatey installed ${app.name}\r\n` });
      return true;
    }
    sendTerminal({
      stream: 'stderr',
      text: `[Chocolatey] ${app.name} failed (exit ${chocoCode})\r\n`
    });
    return false;
  }

  if (!app.chocoId) {
    sendTerminal({
      stream: 'stderr',
      text: `[Skip] No Chocolatey fallback for ${app.name}.\r\n`
    });
  } else if (!chocoAvailable) {
    sendTerminal({
      stream: 'stderr',
      text: `[Skip] Chocolatey not in PATH; cannot fall back for ${app.name}.\r\n`
    });
  }

  return false;
}

function loadWindowIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (!fs.existsSync(iconPath)) return undefined;
  try {
    const img = nativeImage.createFromPath(iconPath);
    return img.isEmpty() ? undefined : img;
  } catch {
    return undefined;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 820,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#050508',
    icon: loadWindowIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Bulk App Installer'
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-apps', () => readAppsCatalog());

ipcMain.handle('check-cli', async () => {
  const winget = await whereExists('winget');
  const choco = await whereExists('choco');
  return { winget, choco };
});

ipcMain.handle('get-install-record', async () => {
  try {
    const map = getInstallRecordStatusMap();
    return { ok: true, map };
  } catch (err) {
    return { ok: false, error: String(err.message || err), map: {} };
  }
});

ipcMain.handle('install-apps', async (_event, apps) => {
  const chocoAvailable = await whereExists('choco');
  const needsWinget = apps.some((a) => a.wingetId);
  if (needsWinget && !(await whereExists('winget'))) {
    sendTerminal({
      stream: 'stderr',
      text: 'WinGet not found. Install App Installer from Microsoft Store or use Windows 11.\r\n'
    });
    return { ok: false, error: 'winget-missing' };
  }

  sendTerminal({
    stream: 'stdout',
    text: `Starting installs (${apps.length} selected)...\r\n`
  });

  let failed = 0;
  for (const appEntry of apps) {
    const ok = await installOneApp(appEntry, chocoAvailable);
    if (ok) {
      markInstalledByThisApp(appEntry.id);
    } else {
      failed += 1;
    }
  }

  sendTerminal({
    stream: 'stdout',
    text: `\r\n========== Batch finished: ${apps.length - failed} ok, ${failed} failed ==========\r\n`
  });

  return { ok: true, failed };
});

ipcMain.handle('upgrade-all', async () => {
  if (!(await whereExists('winget'))) {
    sendTerminal({
      stream: 'stderr',
      text: 'WinGet not found.\r\n'
    });
    return { ok: false, error: 'winget-missing' };
  }

  sendTerminal({ stream: 'stdout', text: '\r\n========== winget upgrade --all ==========\r\n' });
  const args = [
    'upgrade',
    '--all',
    '--silent',
    '--accept-package-agreements',
    '--accept-source-agreements',
    '--include-unknown'
  ];
  sendTerminal({ stream: 'stdout', text: `> winget ${args.join(' ')}\r\n` });
  const code = await runProcess('winget.exe', args);
  sendTerminal({
    stream: code === 0 ? 'stdout' : 'stderr',
    text: `\r\n========== winget upgrade finished (exit ${code}) ==========\r\n`
  });
  return { ok: code === 0, exitCode: code };
});
