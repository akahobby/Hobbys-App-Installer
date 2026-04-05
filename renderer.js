const catalogEl = document.getElementById('catalog');
const terminalEl = document.getElementById('terminal');
const btnInstall = document.getElementById('btnInstall');
const btnUpgradeAll = document.getElementById('btnUpgradeAll');
const btnSelectAll = document.getElementById('btnSelectAll');
const btnClear = document.getElementById('btnClear');
const btnClearLog = document.getElementById('btnClearLog');
const selectionHint = document.getElementById('selectionHint');
const cliStatus = document.getElementById('cliStatus');

/** @type {Map<string, HTMLInputElement>} */
const checkboxes = new Map();

const CATEGORY_ORDER = [
  'Development',
  'Utilities',
  'Browsers',
  'Media',
  'Communication',
  'GPU & vendor tools',
  'Gaming',
  'Graphics',
  'Boot & discs',
  'Hardware & benchmarks',
  'Security',
  'Microsoft Store',
  'Other'
];

let apps = [];
let busy = false;

function appendTerminal(payload) {
  const { stream, text } = payload;
  const span = document.createElement('span');
  if (stream === 'stderr') {
    span.className = 'line-stderr';
  }
  span.textContent = text;
  terminalEl.appendChild(span);
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

function clearTerminal() {
  terminalEl.textContent = '';
}

function setBusy(next) {
  busy = next;
  btnInstall.disabled = next || getSelectedApps().length === 0;
  btnUpgradeAll.disabled = next;
  btnSelectAll.disabled = next;
  btnClear.disabled = next;
}

function getSelectedApps() {
  return apps.filter((a) => checkboxes.get(a.id)?.checked);
}

function updateSelectionUi() {
  const n = getSelectedApps().length;
  selectionHint.textContent = `${n} selected`;
  btnInstall.disabled = busy || n === 0;
}

function groupByCategory(list) {
  const map = new Map();
  for (const item of list) {
    const c = item.category || 'Other';
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(item);
  }
  return map;
}

function sortCategoryKeys(keys) {
  return keys.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function sortAppsInCategory(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function buildBadges(app) {
  const badges = [];
  if (app.directDownload) {
    badges.push({ cls: 'badge badge-direct', text: 'Direct' });
  }
  if (app.wingetSource === 'msstore') {
    badges.push({ cls: 'badge badge-store', text: 'Store (MSIX)' });
    return badges;
  }
  if (app.wingetId && app.chocoId) {
    badges.push({ cls: 'badge badge-dual', text: 'WinGet · Choco' });
  } else if (app.wingetId) {
    badges.push({ cls: 'badge badge-winget', text: 'WinGet' });
  } else if (app.chocoId) {
    badges.push({ cls: 'badge badge-choco', text: 'Choco' });
  }
  return badges;
}

function applyInstallRecord(map) {
  for (const app of apps) {
    const card = catalogEl.querySelector(`[data-app-id="${app.id}"]`);
    if (!card) continue;
    const row = card.querySelector('.app-installed-row');
    const info = map[app.id];
    if (!row || !info) continue;

    row.innerHTML = '';
    row.classList.remove('is-unknown');

    if (info.installed === true) {
      const tag = document.createElement('span');
      tag.className = 'installed-pill installed-yes';
      tag.textContent = 'Installed with this app';
      row.appendChild(tag);
      card.classList.add('card-installed');
    } else {
      card.classList.remove('card-installed');
    }
  }
}

async function loadInstallRecord() {
  try {
    const res = await window.api.getInstallRecord();
    if (res.ok && res.map) {
      applyInstallRecord(res.map);
    }
  } catch {
    /* ignore */
  }
}

function renderCatalog() {
  catalogEl.innerHTML = '';
  checkboxes.clear();

  const grouped = groupByCategory(apps);
  const order = sortCategoryKeys([...grouped.keys()]);

  for (const cat of order) {
    const section = document.createElement('section');
    section.className = 'category-panel';

    const head = document.createElement('div');
    head.className = 'category-head';

    const h2 = document.createElement('h2');
    h2.className = 'category-title';
    h2.textContent = cat;

    const count = document.createElement('span');
    count.className = 'category-count';
    count.textContent = String(grouped.get(cat).length);

    head.appendChild(h2);
    head.appendChild(count);
    section.appendChild(head);

    const list = document.createElement('div');
    list.className = 'app-grid';

    for (const app of sortAppsInCategory(grouped.get(cat))) {
      const card = document.createElement('div');
      card.className = 'app-card';
      card.dataset.appId = app.id;

      const row = document.createElement('div');
      row.className = 'app-card-top';

      const checkId = `app-${app.id}`;
      const checkLabel = document.createElement('label');
      checkLabel.className = 'check-label';
      checkLabel.setAttribute('for', checkId);

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'check-input';
      input.id = checkId;
      input.addEventListener('change', updateSelectionUi);

      const visual = document.createElement('span');
      visual.className = 'check-visual';
      visual.setAttribute('aria-hidden', 'true');

      checkLabel.appendChild(input);
      checkLabel.appendChild(visual);

      const textCol = document.createElement('div');
      textCol.className = 'app-card-text';

      const nameLabel = document.createElement('label');
      nameLabel.className = 'app-name';
      nameLabel.htmlFor = checkId;
      nameLabel.textContent = app.name;

      textCol.appendChild(nameLabel);

      if (app.description) {
        const desc = document.createElement('p');
        desc.className = 'app-desc';
        desc.textContent = app.description;
        textCol.appendChild(desc);
      }

      row.appendChild(checkLabel);
      row.appendChild(textCol);
      card.appendChild(row);

      const installedRow = document.createElement('div');
      installedRow.className = 'app-installed-row';
      card.appendChild(installedRow);

      const badgeRow = document.createElement('div');
      badgeRow.className = 'app-badges';
      for (const b of buildBadges(app)) {
        const badge = document.createElement('span');
        badge.className = b.cls;
        badge.textContent = b.text;
        badgeRow.appendChild(badge);
      }
      card.appendChild(badgeRow);

      list.appendChild(card);
      checkboxes.set(app.id, input);
    }

    section.appendChild(list);
    catalogEl.appendChild(section);
  }

  updateSelectionUi();
}

function renderCliStatus(status) {
  cliStatus.innerHTML = '';
  const wingetRow = document.createElement('span');
  wingetRow.innerHTML = `<span class="dot ${status.winget ? 'ok' : 'bad'}"></span> WinGet`;
  const chocoRow = document.createElement('span');
  chocoRow.innerHTML = `<span class="dot ${status.choco ? 'ok' : 'bad'}"></span> Chocolatey (optional fallback)`;
  cliStatus.appendChild(wingetRow);
  cliStatus.appendChild(chocoRow);
}

btnSelectAll.addEventListener('click', () => {
  for (const cb of checkboxes.values()) {
    cb.checked = true;
  }
  updateSelectionUi();
});

btnClear.addEventListener('click', () => {
  for (const cb of checkboxes.values()) {
    cb.checked = false;
  }
  updateSelectionUi();
});

btnClearLog.addEventListener('click', clearTerminal);

btnInstall.addEventListener('click', async () => {
  const selected = getSelectedApps();
  if (selected.length === 0 || busy) return;
  setBusy(true);
  try {
    await window.api.installApps(selected);
  } finally {
    setBusy(false);
  }
  await loadInstallRecord();
});

btnUpgradeAll.addEventListener('click', async () => {
  if (busy) return;
  setBusy(true);
  try {
    await window.api.upgradeAll();
  } finally {
    setBusy(false);
  }
});

window.api.onTerminalData(appendTerminal);

(async function init() {
  try {
    apps = await window.api.getApps();
    renderCatalog();
    loadInstallRecord();
  } catch (e) {
    catalogEl.textContent = 'Could not load apps.json.';
    appendTerminal({ stream: 'stderr', text: String(e) + '\r\n' });
  }

  try {
    const status = await window.api.checkCli();
    renderCliStatus(status);
  } catch {
    cliStatus.textContent = 'Could not detect CLI tools.';
  }
})();
