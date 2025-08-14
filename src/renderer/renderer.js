const el = (s, r=document) => r.querySelector(s);
const navEl = el('#nav');
const appEl = el('#app');
const searchEl = el('#search');
const btnWinget = el('#btnWinget');

function keyify(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function iconPath(name){ return `./icons/${keyify(name)}.png`; }

// Catalog entries (Essentials + duplicates in their domain categories)
const CATALOG = [
  // Essentials
  { cat:'Essentials', name:'Google Chrome', source:'winget', wingetId:'Google.Chrome', id:'googlechrome' },
  { cat:'Essentials', name:'7-Zip', source:'choco', id:'7zip', wingetId:'7zip.7zip' },
  { cat:'Essentials', name:'Steam', source:'winget', wingetId:'Valve.Steam', id:'steam' },
  { cat:'Essentials', name:'Discord', source:'winget', wingetId:'Discord.Discord', id:'discord' },
  { cat:'Essentials', name:'PowerToys', source:'winget', wingetId:'Microsoft.PowerToys', id:'powertoys' },
  { cat:'Essentials', name:'Microsoft Edge', source:'winget', wingetId:'Microsoft.Edge' },
  { cat:'Essentials', name:'Malwarebytes', source:'choco', id:'malwarebytes', wingetId:'Malwarebytes.Malwarebytes' },

  // Browsers
  { cat:'Browsers', name:'Google Chrome', source:'winget', wingetId:'Google.Chrome', id:'googlechrome' },
  { cat:'Browsers', name:'Firefox', source:'winget', wingetId:'Mozilla.Firefox', id:'firefox' },
  { cat:'Browsers', name:'Brave', source:'winget', wingetId:'Brave.Brave', id:'brave' },
  { cat:'Browsers', name:'Vivaldi', source:'winget', wingetId:'VivaldiTechnologies.Vivaldi', id:'vivaldi' },
  { cat:'Browsers', name:'Opera GX', source:'winget', wingetId:'Opera.OperaGX' },
  { cat:'Browsers', name:'Microsoft Edge', source:'winget', wingetId:'Microsoft.Edge' },

  // Gaming
  { cat:'Gaming', name:'Steam', source:'winget', wingetId:'Valve.Steam', id:'steam' },
  { cat:'Gaming', name:'Epic Games Launcher', source:'winget', wingetId:'EpicGames.EpicGamesLauncher' },
  { cat:'Gaming', name:'Battle.net', source:'winget', wingetId:'Blizzard.BattleNet' },
  { cat:'Gaming', name:'GOG GALAXY', source:'winget', wingetId:'GOG.Galaxy' },
  { cat:'Gaming', name:'Ubisoft Connect', source:'winget', wingetId:'Ubisoft.Connect' },
  { cat:'Gaming', name:'EA App', source:'winget', wingetId:'ElectronicArts.EADesktop' },

  // Media & Audio
  { cat:'Media & Audio', name:'Spotify', source:'winget', wingetId:'Spotify.Spotify' },
  { cat:'Media & Audio', name:'VLC', source:'winget', wingetId:'VideoLAN.VLC', id:'vlc' },
  { cat:'Media & Audio', name:'OBS Studio', source:'winget', wingetId:'OBSProject.OBSStudio', id:'obs-studio' },
  { cat:'Media & Audio', name:'NVIDIA Broadcast', source:'url', id:'nvidia-broadcast' , action:'openUrl', url:'https://international.download.nvidia.com/Windows/broadcast/2.0.2/NVIDIA_Broadcast_v2.0.2.31240911.exe'},
  { cat:'Media & Audio', name:'HandBrake', source:'winget', wingetId:'HandBrake.HandBrake', id:'handbrake' },

  // Utilities - System
  { cat:'Utilities - System', name:'Rufus', source:'winget', wingetId:'Rufus.Rufus', id:'rufus' },
  { cat:'Utilities - System', name:'Git', source:'winget', wingetId:'Git.Git', id:'git' },
  { cat:'Utilities - System', name:'Node.js LTS', source:'winget', wingetId:'OpenJS.NodeJS.LTS', id:'nodejs-lts' },
  { cat:'Utilities - System', name:'Python 3', source:'winget', wingetId:'Python.Python.3.13', id:'python' },
  { cat:'Utilities - System', name:'CPU-Z', source:'winget', wingetId:'CPUID.CPU-Z', id:'cpu-z' },
  { cat:'Utilities - System', name:'GPU-Z', source:'winget', wingetId:'TechPowerUp.GPU-Z', id:'gpu-z' },
  { cat:'Utilities - System', name:'CrystalDiskInfo', source:'winget', wingetId:'CrystalDewWorld.CrystalDiskInfo', id:'crystaldiskinfo' },
  { cat:'Utilities - System', name:'CrystalDiskMark', source:'winget', wingetId:'CrystalDewWorld.CrystalDiskMark', id:'crystaldiskmark' },
  { cat:'Utilities - System', name:'Intel DSA', source:'winget', wingetId:'Intel.IntelDriverAndSupportAssistant', id:'intel-dsa' },
  { cat:'Utilities - System', name:'Dropbox', source:'winget', wingetId:'Dropbox.Dropbox', id:'dropbox' },
  { cat:'Utilities - System', name:'DirectX Runtime', source:'url', id:'directx' , action:'openUrl', url:'https://us5-dl.techpowerup.com/files/BjOuFWLv7b-somehATIZKg/1755170591/DirectX-Redist-Jun-2010.zip'},
  { cat:'Utilities - System', name:'VC++ 2015–2022', source:'url', id:'vcredist140' , check:'microsoft-vcredist-2015-x64', action:'openUrl', url:'https://us9-dl.techpowerup.com/files/yLcsXEkuEzocEm6ivysimg/1755170511/Visual-C-Runtimes-All-in-One-Jul-2025.zip'},
  { cat:'Utilities - System', name:'Logitech G HUB', source:'winget', wingetId:'Logitech.GHUB' },
  { cat:'Utilities - System', name:'Razer Synapse', source:'winget', wingetId:'RazerInc.RazerInstaller.Synapse3' },
  { cat:'Utilities - System', name:'Corsair iCUE', source:'choco', id:'icue', wingetId:'Corsair.iCUE.5' },
  { cat:'Utilities - System', name:'.NET 8 Desktop Runtime', source:'winget', wingetId:'Microsoft.DotNet.DesktopRuntime.8' },
  { cat:'Utilities - System', name:'PowerToys', source:'winget', wingetId:'Microsoft.PowerToys', id:'powertoys' },
  { cat:'Utilities - System', name:'Malwarebytes', source:'choco', id:'malwarebytes', wingetId:'Malwarebytes.Malwarebytes' },

  // GPU Tools
  { cat:'GPU Tools', name:'NVCleanstall', source:'winget', wingetId:'TechPowerUp.NVCleanstall' },
  { cat:'GPU Tools', name:'NVIDIA Profile Inspector', source:'url', id:'nvidia-profile-inspector' , check:'nvidia-profile-inspector', action:'openUrl', url:'https://github.com/Orbmu2k/nvidiaProfileInspector/releases/latest/download/nvidiaProfileInspector.zip'},
  { cat:'GPU Tools', name:'MSI Afterburner', source:'winget', wingetId:'Guru3D.Afterburner', id:'msiafterburner' },
  { cat:'GPU Tools', name:'RTSS', source:'winget', wingetId:'Guru3D.RTSS', id:'rivatuner-statistics-server' },

  // Performance & Tweaks
  { cat:'Performance & Tweaks', name:'Process Lasso', source:'winget', wingetId:'BitSum.ProcessLasso' },
  { cat:'Performance & Tweaks', name:'LatencyMon', source:'winget', wingetId:'Resplendence.LatencyMon' },
  { cat:'Performance & Tweaks', name:'Autoruns', source:'winget', wingetId:'Microsoft.Sysinternals.Autoruns' },
  { cat:'Performance & Tweaks', name:'O&O ShutUp10++', source:'winget', wingetId:'OO-Software.ShutUp10' },
  { cat:'Performance & Tweaks', name:'FanControl', source:'winget', wingetId:'Rem0o.FanControl' },
  { cat:'Performance & Tweaks', name:'Display Driver Uninstaller', source:'winget', wingetId:'Wagnardsoft.DisplayDriverUninstaller', id:'ddu' },
  { cat:'Performance & Tweaks', name:'ExplorerPatcher', source:'winget', wingetId:'valinet.ExplorerPatcher' },


  // Drivers
  { cat:'Drivers', name:'NVIDIA Driver (via NVCleanstall)', source:'winget', wingetId:'TechPowerUp.NVCleanstall', advanced:true, driverKey:'gpu-nvidia' },
  { cat:'Drivers', name:'AMD Adrenalin (open AMD page)', action:'openUrl', url:'https://www.amd.com/en/support/download/drivers.html', advanced:true, driverKey:'gpu-amd' },
  { cat:'Drivers', name:'Intel Graphics (use Intel DSA)', action:'openUrl', url:'https://www.intel.com/content/www/us/en/download-center/home.html', advanced:true, driverKey:'gpu-intel' },
  { cat:'Drivers', name:'Realtek HD Audio (vendor portal)', action:'openUrl', url:'https://www.realtek.com/en/component/zoo/category/pc-audio-codecs-high-definition-audio-codecs-software', advanced:true, driverKey:'audio-realtek' },
  { cat:'Drivers', name:'AMD Chipset Drivers', action:'openUrl', url:'https://www.amd.com/en/support', advanced:true, driverKey:'chipset-amd' },
  { cat:'Drivers', name:'Intel Chipset INF Utility', action:'openUrl', url:'https://www.intel.com/content/www/us/en/download/18495/inf-installer-intel-chipset-device-software.html', advanced:true, driverKey:'chipset-intel' },

  // Communication
  { cat:'Communication', name:'Discord', source:'winget', wingetId:'Discord.Discord', id:'discord' },
  { cat:'Communication', name:'Slack', source:'winget', wingetId:'SlackTechnologies.Slack', id:'slack' },
  { cat:'Communication', name:'Telegram', source:'winget', wingetId:'Telegram.TelegramDesktop', id:'telegram' },
  { cat:'Communication', name:'WhatsApp', source:'winget', wingetId:'9NKSQGP7F2NH' }
];

const ORDER = ['Essentials','Browsers','Gaming','GPU Tools','Performance & Tweaks','Media & Audio','Utilities - System','Drivers','Communication'];

const state = { hasChoco:false, hasWinget:false, installed:new Set(), installing:new Map(), drivers:{} };

// --- sticky installed cache (persists across reloads) ---
const STICKY_KEY = 'hobby.installed.sticky.v1';
function _loadSticky(){
  try { const raw = localStorage.getItem(STICKY_KEY); return raw ? new Set(JSON.parse(raw)) : new Set(); }
  catch { return new Set(); }
}
function _saveSticky(set){
  try { localStorage.setItem(STICKY_KEY, JSON.stringify(Array.from(set))); } catch {}
}
const stickyInstalled = _loadSticky();
function addStickyTokens(tokens){
  let changed = false;
  for (const t of tokens){
    const a = slug(t), b = keyify(t);
    if (!stickyInstalled.has(a)) { stickyInstalled.add(a); changed = true; }
    if (!stickyInstalled.has(b)) { stickyInstalled.add(b); changed = true; }
  }
  if (changed) _saveSticky(stickyInstalled);
}


function slug(s){ return (s||'').toLowerCase(); }
function parseInstalled(chocoText, wingetText){
  const set = new Set();
  chocoText.split(/\r?\n/).forEach(line => { const m = line.match(/^([\w\-\.\+]+)\s/); if (m) set.add(slug(m[1])); });
  wingetText.split(/\r?\n/).forEach(line => { const parts = line.split(/\s{2,}/); if (parts.length >= 2){ set.add(slug(parts[1])); set.add(slug(parts[0])); } });
  return set;
}
function availableSource(item){
  if (item.source === 'choco'){
    if (state.hasChoco) return 'choco';
    if (state.hasWinget && (item.wingetId || item.wingetQuery)) return 'winget';
  } else {
    if (state.hasWinget) return 'winget';
    if (state.hasChoco && item.id) return 'choco';
  }
  return null;
}
function isInstalled(item){
  const c = [];
  if (item && typeof item === 'object'){
    if (item.check)    c.push(String(item.check));
    if (item.wingetId) c.push(String(item.wingetId));
    if (item.id)       c.push(String(item.id));
    if (item.name)     c.push(String(item.name));
  } else if (item) {
    c.push(String(item));
  }
  for (const t of c){
    if (state.installed.has(slug(t)) || state.installed.has(keyify(t))) return true;
    if (stickyInstalled.has(slug(t)) || stickyInstalled.has(keyify(t))) return true;
  }
  return false;
}


function nav(){
  navEl.innerHTML = '';
  const map = {
    'Essentials':'essentials',
    'Browsers':'browsers',
    'Gaming':'gaming',
    'GPU Tools':'gpu_tools',
    'Performance & Tweaks':'performance_tweaks',
    'Media & Audio':'media_audio',
    'Utilities - System':'utilities_system',
    'Drivers':'drivers',
    'Communication':'communication'
  };
  for (const cat of ORDER){
    const a = document.createElement('a');
    a.href = `#${encodeURIComponent(cat)}`;
    a.className = 'link';
    const file = map[cat] || 'essentials';
    a.innerHTML = `<img src="./cat/${file}.svg" alt=""> <span>${cat}</span>`;
    if (location.hash.slice(1) === encodeURIComponent(cat)) a.classList.add('active');
    a.onclick = () => { location.hash = encodeURIComponent(cat); scrollToCat(cat); };
    navEl.appendChild(a);
  }
}

function scrollToCat(cat){ const h = el(`[data-cat="${cat}"]`); if (h) h.scrollIntoView({ behavior:'smooth', block:'start' }); }

function card(item){
  const div = document.createElement('div'); div.className = 'card';
  const installed = isInstalled(item);
  const installing = state.installing.get(item.name);
  const src = availableSource(item);
  const srcLabel = src === 'choco' ? 'Chocolatey' : src === 'winget' ? 'winget' : '—';
  if (installed) div.classList.add('installed');
  div.innerHTML = `
    <img src="${iconPath(item.name)}" alt="icon"/>
    <div><div class="name">${item.name}</div><div class="source">${srcLabel}</div></div>
    <div class="spacer"></div>
    <div class="meta">
      ${installed ? `<span class="pill-ok">Installed</span>` :
        src ? `<button class="btn-install" data-name="${item.name}">${installing ? installing : 'Install'}</button>` :
              `<span class="muted">No installer</span>`}
    </div>`;
  const btn = div.querySelector('button.btn-install');
  if (btn){ btn.addEventListener('click', async () => { state.installing.set(item.name, 'Installing…'); render(); await installOne(item); }); }
  return div;
}

async function installOne(item){
  // Mark as installing and ensure we always clear it
  state.installing.set(item.name, 'Installing');
  render();
  try {
    if (item.advanced){
      const ok = window.confirm('This is an advanced tool. Continue to install/open ' + item.name + '?');
      if (!ok) return;
    }
    if (item.action === 'openUrl'){ window.open(item.url, '_blank'); return; }

    const src = availableSource(item);
    if (!src){ alert('No installer source available for ' + item.name); return; }

    let res = { code: 1, out: '' };
    try {
      if (src === 'choco'){
        const payload = (item.name === 'Corsair iCUE')
          ? { id: (item.id || 'icue'), extraArgs: ['--ignore-checksums'] }
          : (item.id || item.chocoId || item.name);
        res = await window.native.chocoInstall(payload);
      } else {
        const spec = item.wingetId ? { id:item.wingetId } : { query:(item.wingetId || item.name) };
        res = await window.native.wingetInstall(spec);
      }
    } catch (e) {
      res = { code: 1, out: String(e) };
    }

    const text = (res.out || '').toLowerCase();
    const okNoUpgrade =
      text.includes('already installed') ||
      text.includes('no available upgrade') ||
      text.includes('no newer package versions') ||
      text.includes('no applicable update found');

    if (res.code === 0 || okNoUpgrade){
      if (item.check){ state.installed.add(slug(item.check)); state.installed.add(keyify(item.check)); }
      if (item.id){ state.installed.add(slug(item.id)); state.installed.add(keyify(item.id)); }
      if (item.wingetId){ state.installed.add(slug(item.wingetId)); state.installed.add(keyify(item.wingetId)); }
      state.installed.add(slug(item.name)); state.installed.add(keyify(item.name));
      if (typeof addStickyTokens === 'function'){
        addStickyTokens([item.check, item.wingetId, item.id, item.name].filter(Boolean));
      }
      render();
      setTimeout(async () => { try { await refreshInstalled(); render(); } catch {} }, 150);
    } else {
      alert('Failed to install ' + item.name + '\n\n' + (res.out || '').slice(-1200));
    }
  } finally {
    state.installing.delete(item.name);
    render();
  }
}

function section(title, items){
  const sec = document.createElement('section'); sec.className = 'section';
  const header = document.createElement('h2'); header.setAttribute('data-cat', title);
  const left = document.createElement('div'); left.textContent = `${title} • `;
  const count = document.createElement('span'); count.className='muted'; count.textContent = `${items.length} apps`;
  left.appendChild(count);
  const btn = document.createElement('button'); btn.className='btn install-all'; btn.textContent='Install All';
  btn.onclick = async () => { for (const i of items){ if (!isInstalled(i)) await installOne(i); } };
  header.appendChild(left); header.appendChild(btn);
  sec.appendChild(header);
  const grid = document.createElement('div'); grid.className = 'grid';
  items.forEach(i => grid.appendChild(card(i)));
  sec.appendChild(grid);
  return sec;
}

function render(){
  appEl.innerHTML = '';
  const groups = new Map();
  const q = (searchEl.value || '').trim().toLowerCase();
  for (const it of CATALOG){
    if (q && !it.name.toLowerCase().includes(q)) continue;
    if (!groups.has(it.cat)) groups.set(it.cat, []);
    groups.get(it.cat).push(it);
  }
  for (const cat of ORDER) {
    const items = groups.get(cat) || [];
    if (items.length) appEl.appendChild(section(cat, items));
  }
  nav();
}

async function refreshInstalled(){
  for (const t of stickyInstalled) state.installed.add(t);
  const { choco, winget, specials, drivers } = await window.native.listInstalled();
  state.installed = parseInstalled(choco, winget);
  (specials||[]).forEach(s => state.installed.add(slug(s)));
  state.drivers = drivers || {};
}

searchEl.addEventListener('input', () => render());
btnWinget.addEventListener('click', () => window.native.openAppInstaller());

(async function init(){
  const env = await window.native.envCheck();
  state.hasChoco = env.hasChoco;
  state.hasWinget = env.hasWinget;
  await refreshInstalled();
  render();
})();


/* caps poll */
(function(){
  let last = { hasChoco: null, hasWinget: null };
  async function tick(){
    try {
      const caps = await (window.native && window.native.envCheck ? window.native.envCheck() : null);
      if (caps && (caps.hasChoco !== last.hasChoco || caps.hasWinget !== last.hasWinget)){
        if (typeof caps.hasChoco === 'boolean') { try { state.hasChoco = caps.hasChoco; } catch {} }
        if (typeof caps.hasWinget === 'boolean') { try { state.hasWinget = caps.hasWinget; } catch {} }
        last = { hasChoco: caps.hasChoco, hasWinget: caps.hasWinget };
        try { render(); } catch {}
      }
    } catch {}
    setTimeout(tick, 1500);
  }
  setTimeout(tick, 1500);

// --- helper: style a pill like the "Get App Installer" button ---
function styleLikeGetAppInstaller(btn){
  try{
    if (!btn) return false;
    const wingetBtn = document.getElementById('btnWinget')
      || Array.from(document.querySelectorAll('button, a')).find(n=>/get app installer/i.test(n.textContent||''));
    if (!wingetBtn) return false;
    const cs = getComputedStyle(wingetBtn);
    const props = ['backgroundColor','color','border','borderRadius','padding','fontSize','fontWeight','height','boxShadow'];
    for (const p of props){ try { btn.style[p] = cs[p]; } catch {} }
    btn.style.marginLeft = '8px';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '6px';
    return true;
  }catch(e){}
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  try { styleLikeGetAppInstaller(document.getElementById('chocoTopBtn')); } catch {}
});

})();
