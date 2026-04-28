# 🔐 passwordPlease

**A simple, offline password manager that keeps your secrets encrypted on your machine — not on someone else's cloud. Runs on Windows, macOS, and Linux.**

![License](https://img.shields.io/badge/license-CC0--1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Tests](https://img.shields.io/badge/tests-52%2F52-brightgreen)
![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

---

## Why passwordPlease?

- **100% offline** — Your vault is a local file. No accounts, no subscriptions, no servers.
- **Strong encryption** — AES-256-GCM + scrypt. Your data is unreadable without the master password.
- **GUI + CLI** — Desktop app for daily use, command-line for scripting and automation.
- **Agent-friendly** — Built for AI agents and automation. The CLI works headless on servers, supports env vars (`PP_VAULT`, `PP_MASTER_PASSWORD`), outputs JSON (`--json`), and has a programmatic Node.js API. Ready for MCP servers, LLM tool-use, CI/CD pipelines, and any workflow that needs secrets without a browser.
- **Portable** — The vault is a single `.db` file you can copy, back up, or sync however you want.
- **Open source** — Read every line. Zero telemetry, zero tracking, zero cloud dependencies.

## Download

Get the latest release for your platform:

| Platform | Download | Size |
|----------|----------|------|
| 🍎 macOS (Apple Silicon) | [passwordPlease-2.0.0-arm64.dmg](https://github.com/viniciusbuscacio/passwordplease/releases/download/v2.0.0/passwordPlease-2.0.0-arm64.dmg) | 121 MB |
| 🪟 Windows | [passwordPlease-Setup-2.0.0.exe](https://github.com/viniciusbuscacio/passwordplease/releases/tag/v2.0.0) | 135 MB |
| 🐧 Linux | [passwordPlease-2.0.0.AppImage](https://github.com/viniciusbuscacio/passwordplease/releases/download/v2.0.0/passwordPlease-2.0.0.AppImage) | 129 MB |

> **Note:** The app is not code-signed. On macOS, right-click → Open on first launch. On Linux, `chmod +x` the AppImage.

## Desktop App

The GUI lets you create vaults, store passwords, search entries, and copy credentials to clipboard — all with dark mode support.

Features:
- Create and open encrypted vaults
- Store passwords, API keys, tokens, notes
- Search and filter entries
- Copy username/password to clipboard
- Dark/Light mode (auto-detects system preference)
- Touch ID unlock on macOS

## Command-Line (CLI)

Perfect for headless servers, automation, and scripting. No GUI required.

```bash
# Clone and install
git clone https://github.com/viniciusbuscacio/passwordplease.git
cd passwordplease && npm install

# Build TypeScript first
npm run build

# Create a vault
node out/adapters/cli/cli.js init /path/to/vault.db

# Store a secret
node out/adapters/cli/cli.js set "AWS Token" \
  --username "admin" \
  --password "AKIA..." \
  --url "https://aws.amazon.com" \
  --vault /path/to/vault.db \
  --master-password "your-master-password"

# List all entries
node out/adapters/cli/cli.js list --vault /path/to/vault.db --master-password "..."

# Get a secret (plain text or JSON)
node out/adapters/cli/cli.js get "AWS Token" --field password --vault /path/to/vault.db --master-password "..."
node out/adapters/cli/cli.js get "AWS Token" --json --vault /path/to/vault.db --master-password "..."

# Delete
node out/adapters/cli/cli.js delete "AWS Token" --vault /path/to/vault.db --master-password "..."
```

### Environment Variables

Set these to skip `--vault` and `--master-password` on every command:

```bash
export PP_VAULT="/path/to/vault.db"
export PP_MASTER_PASSWORD="your-master-password"

# Now just:
pp list
pp get "AWS Token" --field password
```

### Programmatic API

```js
const { VaultController } = require('./out/controller/VaultController');
const { NodeCryptoProvider } = require('./out/infrastructure/NodeCryptoProvider');
const { SqliteStorageProvider } = require('./out/infrastructure/SqliteStorageProvider');

const ctrl = new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider());
await ctrl.unlock('/path/to/vault.db', 'master-password');
const secret = await ctrl.get('AWS Token');
console.log(secret.password); // AKIA...
await ctrl.lock();
```

## Security

All secrets are encrypted at rest using industry-standard cryptography:

| Layer | Algorithm |
|-------|-----------|
| Data encryption | AES-256-GCM (authenticated, with random IV per entry) |
| Key derivation | scrypt (CPU + memory hard, GPU-resistant) |
| Master password hash | bcrypt (salt factor 12) |
| Storage | SQLite (single portable file) |

The vault file is useless without the master password. There are no backdoors, no recovery keys, and no server-side copies.

## Architecture

Built with **TypeScript** (strict mode) and Clean Architecture — domain logic is decoupled from storage and UI:

```
Adapters (CLI, Electron, API)
        ↓
  VaultController
        ↓
  Use Cases (Create, Unlock, Get, Set, List, Delete)
        ↓
  Domain (Secret, Category, ICryptoProvider, IStorageProvider)
        ↓
  Infrastructure (node:crypto + bcrypt, SQLite)
```

## Development

```bash
git clone https://github.com/viniciusbuscacio/passwordplease.git
cd passwordplease
npm install

# Build TypeScript → JavaScript
npm run build

# Run the desktop app
npm start

# Run tests (52 tests: unit + integration + edge cases)
npm test

# Build for your platform
npm run build:mac     # macOS DMG + ZIP (arm64)
npm run build:win     # Windows NSIS installer
npm run build:linux   # Linux AppImage (x64)
```

## Roadmap

- [x] Clean Architecture rewrite
- [x] TypeScript migration (strict mode)
- [x] Modern crypto (AES-256-GCM + scrypt)
- [x] CLI adapter
- [x] Electron GUI (dark mode, Bootstrap 5.3)
- [x] Touch ID (macOS)
- [x] macOS DMG
- [x] Windows installer (Inno Setup)
- [x] Linux AppImage
- [ ] Change master password (GUI)
- [ ] Export/import vault (JSON)
- [ ] npm publish (`npx pp`)
- [ ] v1 → v2 migration tool

## License

[CC0 1.0 — Public Domain](LICENSE.md)

## Author

**Vinicius Buscacio** — [@viniciusbuscacio](https://github.com/viniciusbuscacio)
