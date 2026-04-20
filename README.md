# 🔐 passwordPlease

> An open-source password manager with CLI + Desktop GUI, built with Clean Architecture.

![License](https://img.shields.io/badge/license-CC0--1.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Tests](https://img.shields.io/badge/tests-23%2F23-brightgreen)

## ✨ What's New in v2.0

**Complete rewrite** with modern architecture and security:

- 🏗️ **Clean Architecture** — Domain / Use Cases / Infrastructure / Adapters
- 🔒 **Modern Crypto** — `node:crypto` native (AES-256-GCM + scrypt + bcrypt), replacing abandoned CryptoJS
- ⌨️ **CLI-first** — Headless operation for automation and scripting
- 🖥️ **Electron GUI** — Single-page app with Bootstrap 5.3
- 🌙 **Dark Mode** — System preference detection + manual toggle
- ✅ **23 Tests** — Unit + Integration, all passing
- 🍎 **Cross-platform** — macOS, Windows, Linux

### Security Upgrades (v1 → v2)

| Aspect | v1 | v2 |
|--------|----|----|n| Data cipher | AES-256-CBC | AES-256-**GCM** (authenticated) |
| Mount key cipher | CryptoJS.AES (EvpKDF) | node:crypto AES-256-GCM |
| KDF | EvpKDF (weak) | **scrypt** (GPU-resistant) |
| Auth tag | None | ✅ Detects tampering |
| Dependencies | crypto-js + cryptojs (abandoned) | node:crypto (built-in, OpenSSL) |

## 📦 Installation

```bash
git clone https://github.com/viniciusbuscacio/passwordplease.git
cd passwordplease
git checkout v2-clean-architecture
npm install
```

## 🚀 Usage

### Desktop GUI (Electron)

```bash
npm start
```

Features:
- Create / Open / Lock vaults
- Add, edit, delete secrets
- Copy username/password to clipboard
- Password generator
- Search secrets
- Dark/Light mode toggle
- Auto-lock timer
- System tray support

### CLI

```bash
# Create a new vault
node src/adapters/cli/cli.js init /path/to/vault.db --master-password "your-password"

# Add a secret
node src/adapters/cli/cli.js set "GitHub Token" \
  --username "user" \
  --password "ghp_xxx" \
  --url "https://github.com" \
  --vault /path/to/vault.db \
  --master-password "your-password"

# List secrets
node src/adapters/cli/cli.js list --vault /path/to/vault.db --master-password "your-password"

# Get a secret (JSON output)
node src/adapters/cli/cli.js get "GitHub Token" --json --vault /path/to/vault.db --master-password "your-password"

# Get a specific field
node src/adapters/cli/cli.js get "GitHub Token" --field password --vault /path/to/vault.db --master-password "your-password"

# Delete a secret
node src/adapters/cli/cli.js delete "GitHub Token" --vault /path/to/vault.db --master-password "your-password"
```

### Environment Variables

Instead of passing `--vault` and `--master-password` every time:

```bash
export PP_VAULT="/path/to/vault.db"
export PP_MASTER_PASSWORD="your-password"

# Now just:
node src/adapters/cli/cli.js list
node src/adapters/cli/cli.js get "GitHub Token" --field password
```

### Programmatic API

```js
const VaultController = require('./src/controller/VaultController');
const NodeCryptoProvider = require('./src/infrastructure/NodeCryptoProvider');
const SqliteStorageProvider = require('./src/infrastructure/SqliteStorageProvider');

const controller = new VaultController(
  new NodeCryptoProvider(),
  new SqliteStorageProvider()
);

await controller.unlock('/path/to/vault.db', 'master-password');
const secret = await controller.get('GitHub Token');
console.log(secret.password);
await controller.lock();
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  ADAPTERS (external interfaces)                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ CLI      │  │ Electron  │  │ API (programmatic)│ │
│  └────┬─────┘  └─────┬─────┘  └────────┬─────────┘ │
│       └───────────────┼────────────────┘            │
│  ┌────────────────────▼───────────────────────┐ │
│  │  VaultController — orchestrates use cases      │ │
│  └────────────────────┬───────────────────────┘ │
│  ┌────────────────────▼───────────────────────┐ │
│  │  USE CASES: CreateVault, UnlockVault, Get/Set/ │ │
│  │  List/Delete Secret                            │ │
│  └────────────────────┬───────────────────────┘ │
│  ┌────────────────────▼───────────────────────┐ │
│  │  DOMAIN: Secret, Category, VaultMetadata       │ │
│  │  ICryptoProvider, IStorageProvider              │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │  INFRASTRUCTURE: NodeCryptoProvider (node:crypto│ │
│  │  + bcrypt), SqliteStorageProvider (sqlite3)    │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 🧪 Tests

```bash
node --test tests/unit/crypto.test.js tests/integration/vault.test.js
```

- **14 unit tests** — Crypto round-trips, tampering detection, key derivation
- **9 integration tests** — Full vault lifecycle (create → set → get → list → delete → lock → unlock)

## 🛠️ Tech Stack

| Component | Technology |
|-----------|----------|
| Crypto (data) | `node:crypto` AES-256-GCM + random IV |
| KDF | `node:crypto` scryptSync |
| Hash (master password) | bcrypt (salt 12) |
| Database | sqlite3 |
| IDs | uuid v4 |
| Desktop GUI | Electron + Bootstrap 5.3 |
| Tests | node:test (built-in) |

## 📝 Roadmap

- [x] Clean Architecture rewrite
- [x] Modern crypto (AES-256-GCM + scrypt)
- [x] CLI adapter
- [x] Electron GUI v2 (dark mode + Bootstrap 5.3)
- [x] Programmatic API
- [ ] macOS .dmg build
- [ ] Linux .AppImage build
- [ ] v1 → v2 migration tool
- [ ] npm publish
- [ ] Change master password (GUI)
- [ ] Export vault (JSON)
- [ ] PWA (mobile) — v3.0

## 📄 License

[CC0 1.0 — Public Domain](LICENSE.md)

## 👤 Author

**Vinicius Buscacio** — [@viniciusbuscacio](https://github.com/viniciusbuscacio)
