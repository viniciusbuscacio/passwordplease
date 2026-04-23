# 🪟 Build passwordPlease para Windows (Avell)

## Pré-requisitos

- **Node.js 20+** (LTS) — https://nodejs.org
- **Git** — pra clonar o repo
- **Windows 11** (testado no Avell)

## Passos

### 1. Clonar o repo

```powershell
cd C:\Users\vinic\Projects   # ou qualquer pasta
git clone https://github.com/viniciusbuscacio/passwordplease.git
cd passwordplease
```

### 2. Instalar dependências (clean)

```powershell
# IMPORTANTE: sempre limpar antes de instalar
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

### 3. Rodar testes (opcional mas recomendado)

```powershell
npm test
# Espera: 52 pass, 0 fail
```

### 4. Build do installer Windows

```powershell
# Limpa node_modules e reinstala (garante native modules pra Electron)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npx electron-builder --win
```

### 5. Resultado

O installer NSIS fica em:
```
dist\passwordPlease Setup x.x.x.exe
```

Só rodar o `.exe` e instalar normalmente.

---

## ⚠️ Regras importantes

| Regra | Motivo |
|-------|--------|
| **NUNCA** rodar `npm rebuild` | Mistura native modules Node↔Electron e quebra tudo |
| **SEMPRE** `rm -rf node_modules && npm install` antes de build | Garante que better-sqlite3 compila pro target correto |
| Testes rodam com Node, build roda com Electron | São targets diferentes do better-sqlite3 |

## 🔑 Notas sobre Windows

- **Touch ID não existe** — a feature é ignorada automaticamente (só macOS)
- **Dark mode** funciona — detecta o tema do Windows automaticamente
- **Vault files** (`.vault`) são portáveis entre Windows/Mac/Linux
- O cofre `viniagent.vault` do Mac funciona no Windows (mesma master password)

## 🐛 Troubleshooting

### `better-sqlite3` falha ao compilar
Instalar build tools do Windows:
```powershell
npm install --global windows-build-tools
# ou
npm install --global --production windows-build-tools
```

### Electron não encontra o ícone
Verificar que `build/icon.ico` existe (já está no repo).

### App abre mas dá "incorrect master password"
Sinal de native module misturado. Fix:
```powershell
Remove-Item -Recurse -Force node_modules
npm install
npx electron-builder --win
```
