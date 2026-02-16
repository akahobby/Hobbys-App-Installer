/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { shell: true, encoding: 'utf8' });
  return { code: (r.status === null || r.status === undefined) ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function loadRendererJs() {
  const p = path.join(__dirname, '..', 'src', 'renderer', 'renderer.js');
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function extractAll(regex, text) {
  const out = [];
  let m;
  while ((m = regex.exec(text))) out.push(m[1]);
  return Array.from(new Set(out)).filter(Boolean);
}

function main() {
  const text = loadRendererJs();

  const wingetIds = extractAll(/wingetId:\s*'([^']+)'/g, text);
  const chocoIds  = extractAll(/source:\s*'choco'[^}]*id:\s*'([^']+)'/g, text);

  console.log(`Found ${wingetIds.length} winget ids, ${chocoIds.length} choco ids`);

  let bad = 0;

  for (const id of wingetIds) {
    const r = run('winget', ['show', '--id', id, '--exact']);
    const ok = r.code === 0 && !/No package found/i.test(r.out);
    if (!ok) {
      bad++;
      console.log(`❌ winget id failed: ${id}`);
      console.log(r.out.slice(-600));
    } else {
      console.log(`✅ winget: ${id}`);
    }
  }

  for (const id of chocoIds) {
    const r = run('choco', ['info', id, '-r']);
    const ok = r.code === 0 && !/not found/i.test(r.out);
    if (!ok) {
      bad++;
      console.log(`❌ choco id failed: ${id}`);
      console.log(r.out.slice(-600));
    } else {
      console.log(`✅ choco: ${id}`);
    }
  }

  if (bad) {
    console.log(`\nFAILED: ${bad} ids look broken.`);
    process.exit(1);
  }

  console.log('\nAll good ✅');
}

main();
