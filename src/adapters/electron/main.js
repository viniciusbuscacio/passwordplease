'use strict';

const { app, BrowserWindow, Menu, Tray, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// macOS: set app name before anything else (menu bar + Dock)
app.setName('passwordPlease');

const VaultController = require('../../controller/VaultController');
const NodeCryptoProvider = require('../../infrastructure/NodeCryptoProvider');
const SqliteStorageProvider = require('../../infrastructure/SqliteStorageProvider');

let mainWindow = null;
let tray = null;
let controller = null;
let currentDbPath = null;
let lockTimeout = null;

const ICONS_DIR = path.join(__dirname, '..', '..', '..', 'images');
const TRAY_DIR = path.join(ICONS_DIR, 'tray');
const LOCKED_ICON = path.join(ICONS_DIR, 'iconLocked.png');
const UNLOCKED_ICON = path.join(ICONS_DIR, 'icon.png');
const TRAY_LOCKED = path.join(TRAY_DIR, 'iconLockedTemplate.png');
const TRAY_UNLOCKED = path.join(TRAY_DIR, 'iconTemplate.png');

const userDataPath = app.getPath('userData');
const configFilePath = path.join(userDataPath, 'passwordPleaseConfig.json');

function readConfig() { try { if (fs.existsSync(configFilePath)) return JSON.parse(fs.readFileSync(configFilePath, 'utf-8')); } catch {} return null; }
function writeConfig(cfg) { fs.writeFileSync(configFilePath, JSON.stringify(cfg, null, 2)); }
function ensureConfig() { if (!readConfig()) writeConfig({ timerToLock: 5, timerToLockEnabled: true, timerToLockUnit: 'minutes', lastOpenedDatabaseFile: null, lockOnMinimize: true, closeToTray: true, generatePasswordSize: 16 }); }
function createController() { controller = new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider()); }

function startLockTimer() { clearLockTimer(); if (!controller || !controller.isUnlocked()) return; const cfg = readConfig(); if (!cfg || !cfg.timerToLockEnabled) return; const units = { seconds: 1, minutes: 60, hours: 3600 }; const ms = (cfg.timerToLock || 5) * (units[cfg.timerToLockUnit] || 60) * 1000; lockTimeout = setTimeout(() => { if (controller && controller.isUnlocked()) { controller.lock(); mainWindow?.webContents.send('vault-locked'); } }, ms); }
function clearLockTimer() { if (lockTimeout) { clearTimeout(lockTimeout); lockTimeout = null; } }

function createWindow() { mainWindow = new BrowserWindow({ width: 480, height: 700, minWidth: 380, minHeight: 500, center: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false }, icon: LOCKED_ICON, title: 'passwordPlease' }); mainWindow.loadFile(path.join(__dirname, 'index.html')); mainWindow.on('minimize', (event) => { const cfg = readConfig(); if (cfg?.lockOnMinimize && controller?.isUnlocked()) { controller.lock(); mainWindow.webContents.send('vault-locked'); } if (cfg?.closeToTray) { event.preventDefault(); mainWindow.hide(); } }); mainWindow.on('close', (event) => { const cfg = readConfig(); if (cfg?.closeToTray && !app.isQuiting && process.platform !== 'darwin') { event.preventDefault(); mainWindow.hide(); } }); const trayIcon = fs.existsSync(TRAY_LOCKED) ? TRAY_LOCKED : LOCKED_ICON; tray = new Tray(trayIcon); tray.setToolTip('passwordPlease'); tray.on('click', () => { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); }); tray.setContextMenu(Menu.buildFromTemplate([ { label: 'Show', click: () => mainWindow.show() }, { label: 'Lock', click: () => { controller?.lock(); mainWindow?.webContents.send('vault-locked'); } }, { type: 'separator' }, { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } } ])); mainWindow.setMenuBarVisibility(false); }

ipcMain.handle('vault:create', async (_e, { dbPath, masterPassword }) => { try { createController(); await controller.create(dbPath, masterPassword); currentDbPath = dbPath; const cfg = readConfig() || {}; cfg.lastOpenedDatabaseFile = dbPath; writeConfig(cfg); mainWindow?.setTitle('passwordPlease — ' + path.basename(dbPath)); if (tray && fs.existsSync(TRAY_UNLOCKED)) tray.setImage(TRAY_UNLOCKED); startLockTimer(); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; } });
ipcMain.handle('vault:unlock', async (_e, { dbPath, masterPassword }) => { try { createController(); await controller.unlock(dbPath, masterPassword); currentDbPath = dbPath; const cfg = readConfig() || {}; cfg.lastOpenedDatabaseFile = dbPath; writeConfig(cfg); mainWindow?.setTitle('passwordPlease — ' + path.basename(dbPath)); if (tray && fs.existsSync(TRAY_UNLOCKED)) tray.setImage(TRAY_UNLOCKED); startLockTimer(); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; } });
ipcMain.handle('vault:lock', async () => { clearLockTimer(); if (controller) await controller.lock(); currentDbPath = null; mainWindow?.setTitle('passwordPlease'); if (tray && fs.existsSync(TRAY_LOCKED)) tray.setImage(TRAY_LOCKED); return { ok: true }; });
ipcMain.handle('vault:status', () => ({ unlocked: controller?.isUnlocked() || false, dbPath: currentDbPath }));
ipcMain.handle('secrets:list', async () => { if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' }; try { return { ok: true, secrets: await controller.list() }; } catch (err) { return { ok: false, error: err.message }; } });
ipcMain.handle('secrets:get', async (_e, { title }) => { if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' }; try { return { ok: true, secret: await controller.get(title) }; } catch (err) { return { ok: false, error: err.message }; } });
ipcMain.handle('secrets:set', async (_e, { data, existingId }) => { if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' }; try { await controller.set(data, existingId); startLockTimer(); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; } });
ipcMain.handle('secrets:delete', async (_e, { id }) => { if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' }; try { await controller.delete(id); startLockTimer(); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; } });
ipcMain.handle('dialog:openFile', async () => { const r = await dialog.showOpenDialog(mainWindow, { title: 'Open Vault', properties: ['openFile'], filters: [{ name: 'SQLite', extensions: ['db','sqlite','sqlite3'] }] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('dialog:saveFile', async () => { const r = await dialog.showSaveDialog(mainWindow, { title: 'Create New Vault', defaultPath: 'vault.db', filters: [{ name: 'SQLite', extensions: ['db','sqlite','sqlite3'] }] }); return r.canceled ? null : r.filePath; });
ipcMain.handle('config:get', () => readConfig());
ipcMain.handle('config:set', (_e, s) => { const cfg = readConfig() || {}; Object.assign(cfg, s); writeConfig(cfg); startLockTimer(); return { ok: true }; });

// macOS: set app name for menu bar + Dock icon
if (process.platform === 'darwin') {
  app.name = 'passwordPlease';
  app.whenReady().then(() => {
    try { app.dock.setIcon(path.join(ICONS_DIR, 'icon.png')); } catch {}
  });
}

app.whenReady().then(() => { const got = app.requestSingleInstanceLock(); if (!got) { app.quit(); return; } app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } }); ensureConfig(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('browser-window-focus', () => { if (controller?.isUnlocked()) startLockTimer(); });
