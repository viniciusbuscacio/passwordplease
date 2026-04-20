#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const VaultController = require('../../controller/VaultController');
const NodeCryptoProvider = require('../../infrastructure/NodeCryptoProvider');
const SqliteStorageProvider = require('../../infrastructure/SqliteStorageProvider');

function getVaultPath(a) { return a['--vault'] || process.env.PP_VAULT || path.join(process.cwd(), 'vault.db'); }
function getMasterPassword(a) {
  if (a['--master-password']) return Promise.resolve(a['--master-password']);
  if (a['--master-password-file']) return Promise.resolve(fs.readFileSync(a['--master-password-file'], 'utf-8').trim());
  if (process.env.PP_MASTER_PASSWORD) return Promise.resolve(process.env.PP_MASTER_PASSWORD);
  return new Promise(r => { const rl = readline.createInterface({ input: process.stdin, output: process.stderr }); rl.question('Master password: ', ans => { rl.close(); r(ans); }); });
}
function parseArgs(argv) {
  const a = { _command: null, _positional: [] }; let i = 2;
  while (i < argv.length) { if (argv[i].startsWith('--')) { const k = argv[i]; const v = (i+1 < argv.length && !argv[i+1].startsWith('--')) ? argv[++i] : true; a[k] = v; } else if (!a._command) a._command = argv[i]; else a._positional.push(argv[i]); i++; }
  return a;
}
function mkCtrl() { return new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider()); }

async function cmdInit(a) {
  const vp = a._positional[0] || getVaultPath(a);
  if (fs.existsSync(vp)) { console.error(`Error: vault exists at ${vp}`); process.exit(1); }
  const mp = await getMasterPassword(a), c = mkCtrl();
  await c.create(vp, mp); await c.lock();
  console.log(`\u2705 Vault created at ${vp}`);
}
async function cmdGet(a) {
  const t = a._positional[0]; if (!t) { console.error('Usage: pp get <title>'); process.exit(1); }
  const c = mkCtrl(), mp = await getMasterPassword(a); await c.unlock(getVaultPath(a), mp);
  try { const s = await c.get(t, a['--field']); if (a['--json']) console.log(JSON.stringify(typeof s === 'string' ? {value:s} : s, null, 2)); else if (typeof s === 'string') console.log(s); else { console.log(`Title:    ${s.title}`); console.log(`Username: ${s.username||''}`); console.log(`Password: ${s.password||''}`); console.log(`URL:      ${s.url||''}`); console.log(`Notes:    ${s.notes||''}`); } } finally { await c.lock(); }
}
async function cmdSet(a) {
  const t = a._positional[0]; if (!t) { console.error('Usage: pp set <title> --username <u> --password <p>'); process.exit(1); }
  const c = mkCtrl(), mp = await getMasterPassword(a); await c.unlock(getVaultPath(a), mp);
  try { await c.set({ title: t, username: a['--username']||null, password: a['--password']||null, url: a['--url']||null, notes: a['--notes']||null, categoryId: a['--category']||null }); console.log(`\u2705 Secret "${t}" saved.`); } finally { await c.lock(); }
}
async function cmdList(a) {
  const c = mkCtrl(), mp = await getMasterPassword(a); await c.unlock(getVaultPath(a), mp);
  try { const ss = await c.list(); if (a['--json']) console.log(JSON.stringify(ss,null,2)); else if (!ss.length) console.log('No secrets.'); else ss.forEach(s => console.log(`  ${s.title} \u2014 ${s.username||'(no username)'}`)); } finally { await c.lock(); }
}
async function cmdDelete(a) {
  const t = a._positional[0]; if (!t) { console.error('Usage: pp delete <title>'); process.exit(1); }
  const c = mkCtrl(), mp = await getMasterPassword(a); await c.unlock(getVaultPath(a), mp);
  try { const s = await c.get(t); await c.delete(s.id); console.log(`\u2705 Secret "${t}" deleted.`); } finally { await c.lock(); }
}
function showHelp() { console.log(`\npasswordPlease CLI v2.0\n\nUsage: pp <command> [options]\n\nCommands:\n  init [path]     Create a new vault\n  get <title>     Get a secret\n  set <title>     Create/update a secret\n  list            List all secrets\n  delete <title>  Delete a secret\n\nOptions:\n  --vault <path>            Vault path (default: $PP_VAULT or ./vault.db)\n  --master-password <pw>    Master password\n  --master-password-file <f> Read from file\n  --field <f>               Specific field\n  --json                    JSON output\n  --username/--password/--url/--notes/--category  For set\n`); }

async function main() {
  const a = parseArgs(process.argv);
  try { switch(a._command) { case 'init': await cmdInit(a); break; case 'get': await cmdGet(a); break; case 'set': await cmdSet(a); break; case 'list': await cmdList(a); break; case 'delete': await cmdDelete(a); break; case 'help': case '--help': case null: case undefined: showHelp(); break; default: console.error(`Unknown: ${a._command}`); showHelp(); process.exit(1); } } catch(e) { console.error(`\u274c ${e.message}`); process.exit(1); }
}
main();
