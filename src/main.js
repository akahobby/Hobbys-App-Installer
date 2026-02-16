const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');

// ---- Minimal backend resolver (no extra imports) ----
let WINGET_EXE = null;
let CHOCO_EXE = null;

// ---- Winget hard-path helpers (safe) ----
function firstExisting(paths){
  for (const p of (paths||[])){
    try { if (p && fs.existsSync(p)) return p; } catch {}
  }
  return null;
}
function hardpathWinget(){
  const paths = [];
  const la = process.env.LOCALAPPDATA;
  const home = process.env.USERPROFILE;
  const sysroot = process.env.SystemRoot || 'C:\\\\Windows';
  if (la)   paths.push(path.join(la, 'Microsoft', 'WindowsApps', 'winget.exe'));
  if (home) paths.push(path.join(home, 'AppData','Local','Microsoft','WindowsApps','winget.exe'));
  paths.push(path.join(sysroot, 'System32', 'winget.exe'));
  return firstExisting(paths);
}

async function resolveBackendsSimple(){
  try {
    // If winget is on PATH, note it
    let r = await run(WINGET_EXE || 'winget', ['--version']).catch(() => ({code:1,out:''}));
    if (r && r.code === 0) { WINGET_EXE = 'winget'; }
    if (!WINGET_EXE){
      const w = await run('cmd.exe', ['/d','/s','/c','where winget']).catch(()=>({code:1,out:''}));
      const line = (w.out||'').split(/\r?\n/).map(s=>s.trim()).find(t=>/winget\.exe$/i.test(t));
      if (line) WINGET_EXE = line;
    }
  } catch {}

  try {
    // Chocolatey is often in a known location even if PATH is missing
    if (process.env['ChocolateyInstall']) {
      CHOCO_EXE = process.env['ChocolateyInstall'] + '\\bin\\choco.exe';
    }
    if (!CHOCO_EXE){
      const c = await run('cmd.exe', ['/d','/s','/c','where choco']).catch(()=>({code:1,out:''}));
      const line = (c.out||'').split(/\r?\n/).map(s=>s.trim()).find(t=>/choco\.exe$/i.test(t));
      if (line) CHOCO_EXE = line;
    }
    // Fallback to PATH name if check passes
    if (!CHOCO_EXE){
      const r2 = await run(CHOCO_EXE || 'choco', ['-v']).catch(()=>({code:1,out:''}));
      if (r2 && r2.code === 0) CHOCO_EXE = 'choco';
    }
  } catch {}

  if (!WINGET_EXE) { try { const hp = hardpathWinget(); if (hp) WINGET_EXE = hp; } catch {} }
}

async function hasWinget(){ await resolveBackendsSimple();
  const { shell } = require('electron'); return !!WINGET_EXE; }
async function hasChoco(){ await resolveBackendsSimple();
  const { shell } = require('electron'); return !!CHOCO_EXE; }
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let win;

function createWin() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0b0a10',
    autoHideMenuBar: true,
    titleBarOverlay: { color: '#0b0a10', symbolColor: '#e7e4ff', height: 36 },
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWin);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

function run(cmd, args, opts={}){
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: true, windowsHide: true, ...opts });
    let out=''; let err='';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('close', code => resolve({ code, out, err }));
  });
}

ipcMain.handle('env:check', async () => {
  await resolveBackendsSimple();
  const c = await run(CHOCO_EXE || 'choco', ['-v']);
  const w = await run(WINGET_EXE || 'winget', ['-v']);
  return { hasChoco: c.code === 0, hasWinget: w.code === 0, chocoVer: c.out.trim(), wingetVer: w.out.trim() };
});

ipcMain.handle('installed:list', async () => {
  await resolveBackendsSimple();
  const ch = await run(CHOCO_EXE || 'choco', ['list', '--localonly']);
  const wg = await run(WINGET_EXE || 'winget', ['list', '--accept-source-agreements']);

  // Registry checks for VC++ 2015-2022 and .NET 8 Desktop Runtime
  async function regQuery(path) {
    const r = await run('reg', ['query', path]);
    return r.code === 0 ? (r.out || '') : '';
  }
  const uninstallRoots = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
  ];
  let uninstallDump = '';
  for (const root of uninstallRoots) uninstallDump += await regQuery(root) + '\n';

  // .NET Desktop Runtime 8: also check specific dotnet setup keys
  const dotnetFX = await run('reg', ['query', 'HKLM\\SOFTWARE\\dotnet\\Setup\\InstalledVersions\\x64\\sharedfx\\Microsoft.WindowsDesktop.App']);
  const specials = [];
  if (/Microsoft Visual C\\+\\+.*2015-2022|VC\\+\\+.*2015|2015-2022 Redistributable/i.test(uninstallDump)) {
    specials.push('vcredist140');
  }
  if (dotnetFX.code === 0 || /\\.NET(\\s+)?8(\\s+)?Desktop Runtime/i.test(uninstallDump)) {
    specials.push('Microsoft.DotNet.DesktopRuntime.8');
  }

  
  // Driver detection via PowerShell: GPU vendor & versions, audio codec presence
  async function ps(script){
    return await run('powershell', ['-NoProfile','-ExecutionPolicy','Bypass','-Command', script]);
  }
  let drivers = {};
  try {
    const disp = await ps('Get-CimInstance Win32_PnPSignedDriver | Where-Object {$_.DeviceClass -eq \"DISPLAY\"} | Select-Object -ExpandProperty Manufacturer');
    const s = (disp.out || '').toLowerCase();
    drivers['gpu-nvidia'] = s.includes('nvidia');
    drivers['gpu-amd'] = s.includes('advanced micro devices') || s.includes('amd');
    drivers['gpu-intel'] = s.includes('intel');
  } catch(e){}
  try {
    const aud = await ps('Get-CimInstance Win32_PnPSignedDriver | Where-Object {$_.DeviceClass -eq \"MEDIA\"} | Select-Object -ExpandProperty Manufacturer');
    const a = (aud.out || '').toLowerCase();
    drivers['audio-realtek'] = a.includes('realtek');
  } catch(e){}
  try {
    // chipset presence via common software names from Uninstall keys
    const reg = await run('reg', ['query','HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall','/s']);
    const reg2 = await run('reg', ['query','HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall','/s']);
    const dump = (reg.out||'') + (reg2.out||'');
    drivers['chipset-amd'] = /AMD Chipset Software/i.test(dump);
    drivers['chipset-intel'] = /Intel\\s+Chipset|Chipset Device Software/i.test(dump);
  } catch(e){}

  return { choco: ch.out, winget: wg.out, specials, drivers };
});

ipcMain.handle('install:choco', async (_e, idOrPayload) => {
  let id, extraArgs = [];
  if (typeof idOrPayload === 'string') id = idOrPayload;
  else if (idOrPayload && typeof idOrPayload === 'object') {
    id = idOrPayload.id;
    extraArgs = Array.isArray(idOrPayload.extraArgs) ? idOrPayload.extraArgs : [];
  }
  // Special-case iCUE: checksum often drifts upstream
  if ((id || '').toLowerCase() === 'icue' && !extraArgs.includes('--ignore-checksums')) {
    extraArgs = [...extraArgs, '--ignore-checksums'];
  }
  const args = ['install', id, '-y', '--no-progress', '--limit-output', '--acceptlicense', ...extraArgs];
  const r = await run(CHOCO_EXE || 'choco', args);
  return { code: r.code, out: r.out + r.err };
});

ipcMain.handle('install:winget', async (_e, spec) => {
  await resolveBackendsSimple();
  spec = spec || {};
  const src = spec.source ? ['--source', spec.source] : [];
  const common = ['--accept-source-agreements', '--accept-package-agreements', '--silent', '-h'];

  let args;
  if (spec.mode === 'upgrade') {
    if (spec.id) args = ['upgrade', '--id', spec.id, '--exact', ...src, ...common];
    else args = ['upgrade', '--all', ...src, ...common];
  } else {
    if (spec.id) args = ['install', '--id', spec.id, '--exact', ...src, ...common];
    else args = ['install', '--query', spec.query || '', ...src, ...common];
  }

  const r = await run(WINGET_EXE || 'winget', args);
  return { code: r.code, out: r.out + r.err };
});

ipcMain.handle('winget:upgradeAll', async () => {
  await resolveBackendsSimple();
  const r = await run(WINGET_EXE || 'winget', [
    'upgrade','--all',
    '--accept-source-agreements','--accept-package-agreements',
    '--silent','-h'
  ]);
  return { code: r.code, out: r.out + r.err };
});

// ---- Streamed winget upgrade (live output to renderer) ----
let __wingetUpgradeChild = null;
ipcMain.on('winget:upgradeAll:stream', async (event) => {
  try {
    await resolveBackendsSimple();
    if (__wingetUpgradeChild) {
      try { event.sender.send('winget:upgradeAll:output', '[Installer] Upgrade already running.\n'); } catch {}
      try { event.sender.send('winget:upgradeAll:done', { code: 1 }); } catch {}
      return;
    }

    const args = [
      'upgrade','--all',
      '--accept-source-agreements','--accept-package-agreements',
      '--silent','-h'
    ];

    const child = spawn(WINGET_EXE || 'winget', args, { shell: true, windowsHide: true });
    __wingetUpgradeChild = child;

    const send = (chunk) => {
      try { event.sender.send('winget:upgradeAll:output', String(chunk)); } catch {}
    };
    child.stdout.on('data', d => send(d.toString()));
    child.stderr.on('data', d => send(d.toString()));

    child.on('close', (code) => {
      __wingetUpgradeChild = null;
      try { event.sender.send('winget:upgradeAll:done', { code: Number(code ?? 1) }); } catch {}
    });
  } catch (_e) {
    __wingetUpgradeChild = null;
    try { event.sender.send('winget:upgradeAll:output', '[Installer] Upgrade failed to start.\n'); } catch {}
    try { event.sender.send('winget:upgradeAll:done', { code: 1 }); } catch {}
  }
});

ipcMain.handle('winget:show', async (_e, { id, source }) => {
  await resolveBackendsSimple();
  const src = source ? ['--source', source] : [];
  const r = await run(WINGET_EXE || 'winget', ['show','--id', id, '--exact', ...src]);
  return { code: r.code, out: r.out + r.err };
});

ipcMain.handle('choco:info', async (_e, { id }) => {
  await resolveBackendsSimple();
  const r = await run(CHOCO_EXE || 'choco', ['info', id, '-r']);
  return { code: r.code, out: r.out + r.err };
});

ipcMain.handle('choco:ensure', async () => {
  try { await ensureChocoInBackground(); _envQuickRefreshLoop(); } catch {}
  return { ok: true };
});

ipcMain.handle('open:appinstaller', () => {
  shell.openExternal('ms-windows-store://pdp/?PFN=Microsoft.DesktopAppInstaller_8wekyb3d8bbwe');
});


// ---- Background Chocolatey ensure (minimal, safe quoting) ----
let __bgChocoOnce = false;
function _toPwshB64(script){
  try { return Buffer.from(String(script),'utf16le').toString('base64'); } catch { return ''; }
}
async function ensureChocoInBackground(){
  if (__bgChocoOnce) return; __bgChocoOnce = true;
  try {
    await resolveBackendsSimple();
  const { shell } = require('electron');
    if (!CHOCO_EXE){
      const core = "Set-ExecutionPolicy Bypass -Scope Process -Force; " +
                   "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " +
                   "iwr https://community.chocolatey.org/install.ps1 -UseBasicParsing | iex";
      const b64 = _toPwshB64(core);
      await run('powershell', ['-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand', b64]).catch(()=>{});
      const elevatedArg = '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ' + b64;
      await run('powershell', [
        '-NoProfile','-ExecutionPolicy','Bypass','-Command',
        'Start-Process','PowerShell','-WindowStyle','Hidden','-Verb','RunAs','-ArgumentList', elevatedArg
      ]).catch(()=>{});
      await resolveBackendsSimple();
  const { shell } = require('electron');
    }
  } catch {}
}


function _envQuickRefreshLoop(retries=12){
  let n = 0;
  const t = setInterval(async () => {
    n++;
    await resolveBackendsSimple();
    if (CHOCO_EXE || WINGET_EXE || n>=retries){ clearInterval(t); }
  }, 2500);
}



// --- Block popups & externalize http(s) (added) ---
try {
  const { BrowserWindow } = require('electron');
  const attachNoPopups = (wc) => {
    wc.setWindowOpenHandler(({ url }) => {
      try { shell.openExternal(url); } catch {}
      return { action: 'deny' };
    });
    wc.on('will-navigate', (e, url) => {
      if (/^https?:/i.test(url)) { e.preventDefault(); try { shell.openExternal(url); } catch {} }
    });
  };
  app.on('web-contents-created', (_e, wc) => attachNoPopups(wc));
} catch {}

// --- Fallback to index.html on load failure (added) ---
try {
  const path = require('path');
  const fs = require('fs');
  app.on('web-contents-created', (_e, wc) => {
    wc.on('did-fail-load', (_e2, code, desc, url, isMainFrame) => {
      try {
        const win = require('electron').BrowserWindow.fromWebContents(wc);
        const fallback = path.join(__dirname, 'renderer', 'index.html');
        if (isMainFrame && win && !win.isDestroyed() && fs.existsSync(fallback)) {
          win.loadFile(fallback).catch(()=>{});
        }
      } catch {}
    });
  });
} catch {}
