#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { VaultController } from '../../controller/VaultController';
import { NodeCryptoProvider } from '../../infrastructure/NodeCryptoProvider';
import { SqliteStorageProvider } from '../../infrastructure/SqliteStorageProvider';
import { Secret } from '../../domain/entities/Secret';

interface ParsedArgs {
  _command: string | null;
  _positional: string[];
  [key: string]: string | boolean | string[] | null;
}

function getVaultPath(a: ParsedArgs): string {
  return (a['--vault'] as string) || process.env.PP_VAULT || path.join(process.cwd(), 'vault.db');
}

function getMasterPassword(a: ParsedArgs): Promise<string> {
  if (a['--master-password']) return Promise.resolve(a['--master-password'] as string);
  if (a['--master-password-file']) return Promise.resolve(fs.readFileSync(a['--master-password-file'] as string, 'utf-8').trim());
  if (process.env.PP_MASTER_PASSWORD) return Promise.resolve(process.env.PP_MASTER_PASSWORD);
  return new Promise(r => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question('Master password: ', ans => { rl.close(); r(ans); });
  });
}

function parseArgs(argv: string[]): ParsedArgs {
  const a: ParsedArgs = { _command: null, _positional: [] };
  let i = 2;
  while (i < argv.length) {
    if (argv[i].startsWith('--')) {
      const k = argv[i];
      const v = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
      a[k] = v;
    } else if (!a._command) {
      a._command = argv[i];
    } else {
      a._positional.push(argv[i]);
    }
    i++;
  }
  return a;
}

function mkCtrl(): VaultController {
  return new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider());
}

async function cmdInit(a: ParsedArgs): Promise<void> {
  const vp = a._positional[0] || getVaultPath(a);
  if (fs.existsSync(vp)) { console.error(`Error: vault exists at ${vp}`); process.exit(1); }
  const mp = await getMasterPassword(a);
  const c = mkCtrl();
  await c.create(vp, mp);
  await c.lock();
  console.log(`\u2705 Vault created at ${vp}`);
}

async function cmdGet(a: ParsedArgs): Promise<void> {
  const t = a._positional[0];
  if (!t) { console.error('Usage: pp get <title>'); process.exit(1); }
  const c = mkCtrl();
  const mp = await getMasterPassword(a);
  await c.unlock(getVaultPath(a), mp);
  try {
    const s = await c.get(t, a['--field'] as string | undefined);
    if (a['--json']) {
      console.log(JSON.stringify(typeof s === 'string' ? { value: s } : s, null, 2));
    } else if (typeof s === 'string') {
      console.log(s);
    } else {
      const secret = s as Secret;
      console.log(`Title:    ${secret.title}`);
      console.log(`Username: ${secret.username || ''}`);
      console.log(`Password: ${secret.password || ''}`);
      console.log(`URL:      ${secret.url || ''}`);
      console.log(`Notes:    ${secret.notes || ''}`);
    }
  } finally {
    await c.lock();
  }
}

async function cmdSet(a: ParsedArgs): Promise<void> {
  const t = a._positional[0];
  if (!t) { console.error('Usage: pp set <title> --username <u> --password <p>'); process.exit(1); }
  const c = mkCtrl();
  const mp = await getMasterPassword(a);
  await c.unlock(getVaultPath(a), mp);
  try {
    await c.set({
      title: t,
      username: (a['--username'] as string) || null,
      password: (a['--password'] as string) || null,
      url: (a['--url'] as string) || null,
      notes: (a['--notes'] as string) || null,
      categoryId: (a['--category'] as string) || null
    });
    console.log(`\u2705 Secret "${t}" saved.`);
  } finally {
    await c.lock();
  }
}

async function cmdList(a: ParsedArgs): Promise<void> {
  const c = mkCtrl();
  const mp = await getMasterPassword(a);
  await c.unlock(getVaultPath(a), mp);
  try {
    const ss = await c.list();
    if (a['--json']) {
      console.log(JSON.stringify(ss, null, 2));
    } else if (!ss.length) {
      console.log('No secrets.');
    } else {
      ss.forEach(s => console.log(`  ${s.title} \u2014 ${s.username || '(no username)'}`));
    }
  } finally {
    await c.lock();
  }
}

async function cmdDelete(a: ParsedArgs): Promise<void> {
  const t = a._positional[0];
  if (!t) { console.error('Usage: pp delete <title>'); process.exit(1); }
  const c = mkCtrl();
  const mp = await getMasterPassword(a);
  await c.unlock(getVaultPath(a), mp);
  try {
    const s = await c.get(t) as Secret;
    await c.delete(s.id!);
    console.log(`\u2705 Secret "${t}" deleted.`);
  } finally {
    await c.lock();
  }
}

function showHelp(): void {
  console.log(`
passwordPlease CLI v2.0

Usage: pp <command> [options]

Commands:
  init [path]     Create a new vault
  get <title>     Get a secret
  set <title>     Create/update a secret
  list            List all secrets
  delete <title>  Delete a secret

Options:
  --vault <path>            Vault path (default: $PP_VAULT or ./vault.db)
  --master-password <pw>    Master password
  --master-password-file <f> Read from file
  --field <f>               Specific field
  --json                    JSON output
  --username/--password/--url/--notes/--category  For set
`);
}

async function main(): Promise<void> {
  const a = parseArgs(process.argv);
  try {
    switch (a._command) {
      case 'init': await cmdInit(a); break;
      case 'get': await cmdGet(a); break;
      case 'set': await cmdSet(a); break;
      case 'list': await cmdList(a); break;
      case 'delete': await cmdDelete(a); break;
      case 'help': case '--help': case null: case undefined: showHelp(); break;
      default: console.error(`Unknown: ${a._command}`); showHelp(); process.exit(1);
    }
  } catch (e: any) {
    console.error(`\u274c ${e.message}`);
    process.exit(1);
  }
}

main();
