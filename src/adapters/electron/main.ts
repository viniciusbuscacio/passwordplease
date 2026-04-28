'use strict';

import { app, BrowserWindow, Menu, dialog, ipcMain, systemPreferences, safeStorage, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs';

// macOS: set app name before anything else (menu bar + Dock)
app.setName('passwordPlease');

import { VaultController } from '../../controller/VaultController';
import { NodeCryptoProvider } from '../../infrastructure/NodeCryptoProvider';
import { SqliteStorageProvider } from '../../infrastructure/SqliteStorageProvider';

interface AppConfig {
  timerToLock: number;
  timerToLockEnabled: boolean;
  timerToLockUnit: 'seconds' | 'minutes' | 'hours';
  lastOpenedDatabaseFile: string | null;
  lockOnMinimize: boolean;
  closeToTray: boolean;
  generatePasswordSize: number;
  biometricEnabled?: boolean;
}

let mainWindow: BrowserWindow | null = null;
let controller: VaultController | null = null;
let currentDbPath: string | null = null;
let lockTimeout: ReturnType<typeof setTimeout> | null = null;

const ICONS_DIR = path.join(__dirname, '..', '..', '..', 'images');
const APP_ICON = path.join(ICONS_DIR, 'icon.png');

const userDataPath = app.getPath('userData');
const configFilePath = path.join(userDataPath, 'passwordPleaseConfig.json');

function readConfig(): AppConfig | null {
  try {
    if (fs.existsSync(configFilePath)) return JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
  } catch {}
  return null;
}

function writeConfig(cfg: AppConfig): void {
  fs.writeFileSync(configFilePath, JSON.stringify(cfg, null, 2));
}

function ensureConfig(): void {
  if (!readConfig()) writeConfig({
    timerToLock: 5,
    timerToLockEnabled: true,
    timerToLockUnit: 'minutes',
    lastOpenedDatabaseFile: null,
    lockOnMinimize: true,
    closeToTray: true,
    generatePasswordSize: 16
  });
}

function createController(): void {
  controller = new VaultController(new NodeCryptoProvider(), new SqliteStorageProvider());
}

function startLockTimer(): void {
  clearLockTimer();
  if (!controller || !controller.isUnlocked()) return;
  const cfg = readConfig();
  if (!cfg || !cfg.timerToLockEnabled) return;
  const units: Record<string, number> = { seconds: 1, minutes: 60, hours: 3600 };
  const ms = (cfg.timerToLock || 5) * (units[cfg.timerToLockUnit] || 60) * 1000;
  lockTimeout = setTimeout(() => {
    if (controller && controller.isUnlocked()) {
      controller.lock();
      mainWindow?.webContents.send('vault-locked');
    }
  }, ms);
}

function clearLockTimer(): void {
  if (lockTimeout) { clearTimeout(lockTimeout); lockTimeout = null; }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480, height: 700, minWidth: 380, minHeight: 500, center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'passwordPlease'
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('minimize', () => {
    const cfg = readConfig();
    if (cfg?.lockOnMinimize && controller?.isUnlocked()) {
      controller.lock();
      mainWindow!.webContents.send('vault-locked');
    }
  });
  mainWindow.on('close', (event) => {
    const cfg = readConfig();
    if (cfg?.closeToTray && !(app as any).isQuiting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow!.hide();
    }
  });
  mainWindow.setMenuBarVisibility(false);
}

// --- Vault IPC handlers ---

ipcMain.handle('vault:create', async (_e: IpcMainInvokeEvent, { dbPath, masterPassword }: { dbPath: string; masterPassword: string }) => {
  try {
    createController();
    await controller!.create(dbPath, masterPassword);
    currentDbPath = dbPath;
    const cfg = readConfig() || {} as AppConfig;
    cfg.lastOpenedDatabaseFile = dbPath;
    writeConfig(cfg);
    mainWindow?.setTitle('passwordPlease — ' + path.basename(dbPath));
    startLockTimer();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('vault:unlock', async (_e: IpcMainInvokeEvent, { dbPath, masterPassword }: { dbPath: string; masterPassword: string }) => {
  try {
    createController();
    await controller!.unlock(dbPath, masterPassword);
    currentDbPath = dbPath;
    const cfg = readConfig() || {} as AppConfig;
    cfg.lastOpenedDatabaseFile = dbPath;
    writeConfig(cfg);
    mainWindow?.setTitle('passwordPlease — ' + path.basename(dbPath));
    startLockTimer();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('vault:lock', async () => {
  clearLockTimer();
  if (controller) await controller.lock();
  currentDbPath = null;
  mainWindow?.setTitle('passwordPlease');
  return { ok: true };
});

ipcMain.handle('vault:status', () => ({
  unlocked: controller?.isUnlocked() || false,
  dbPath: currentDbPath
}));

ipcMain.handle('secrets:list', async () => {
  if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' };
  try { return { ok: true, secrets: await controller.list() }; }
  catch (err: any) { return { ok: false, error: err.message }; }
});

ipcMain.handle('secrets:get', async (_e: IpcMainInvokeEvent, { title }: { title: string }) => {
  if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' };
  try { return { ok: true, secret: await controller.get(title) }; }
  catch (err: any) { return { ok: false, error: err.message }; }
});

ipcMain.handle('secrets:set', async (_e: IpcMainInvokeEvent, { data, existingId }: { data: any; existingId?: string }) => {
  if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' };
  try { await controller.set(data, existingId); startLockTimer(); return { ok: true }; }
  catch (err: any) { return { ok: false, error: err.message }; }
});

ipcMain.handle('secrets:delete', async (_e: IpcMainInvokeEvent, { id }: { id: string }) => {
  if (!controller?.isUnlocked()) return { ok: false, error: 'Vault is locked' };
  try { await controller.delete(id); startLockTimer(); return { ok: true }; }
  catch (err: any) { return { ok: false, error: err.message }; }
});

ipcMain.handle('dialog:openFile', async () => {
  const r = await dialog.showOpenDialog(mainWindow!, {
    title: 'Open Vault', properties: ['openFile'],
    filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }]
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async () => {
  const r = await dialog.showSaveDialog(mainWindow!, {
    title: 'Create New Vault', defaultPath: 'vault.db',
    filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }]
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle('config:get', () => readConfig());
ipcMain.handle('config:set', (_e: IpcMainInvokeEvent, s: Partial<AppConfig>) => {
  const cfg = readConfig() || {} as AppConfig;
  Object.assign(cfg, s);
  writeConfig(cfg);
  startLockTimer();
  return { ok: true };
});

// --- Touch ID / Biometric authentication ---
const biometricFilePath = path.join(userDataPath, 'biometric.dat');

ipcMain.handle('biometric:available', () => {
  if (process.platform !== 'darwin') return false;
  try { return systemPreferences.canPromptTouchID(); } catch { return false; }
});

ipcMain.handle('biometric:enrolled', (_e: IpcMainInvokeEvent, { dbPath }: { dbPath: string }) => {
  try {
    if (!fs.existsSync(biometricFilePath)) return false;
    const data = JSON.parse(fs.readFileSync(biometricFilePath, 'utf-8'));
    return !!data[dbPath];
  } catch { return false; }
});

ipcMain.handle('biometric:enroll', async (_e: IpcMainInvokeEvent, { dbPath, masterPassword }: { dbPath: string; masterPassword: string }) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'Encryption not available' };
    const encrypted = safeStorage.encryptString(masterPassword);
    let data: Record<string, string> = {};
    try { if (fs.existsSync(biometricFilePath)) data = JSON.parse(fs.readFileSync(biometricFilePath, 'utf-8')); } catch {}
    data[dbPath] = encrypted.toString('base64');
    fs.writeFileSync(biometricFilePath, JSON.stringify(data, null, 2));
    const cfg = readConfig() || {} as AppConfig;
    cfg.biometricEnabled = true;
    writeConfig(cfg);
    return { ok: true };
  } catch (err: any) { return { ok: false, error: err.message }; }
});

ipcMain.handle('biometric:authenticate', async (_e: IpcMainInvokeEvent, { dbPath }: { dbPath: string }) => {
  try {
    await systemPreferences.promptTouchID('Unlock passwordPlease');
    if (!fs.existsSync(biometricFilePath)) return { ok: false, error: 'No biometric data' };
    const data = JSON.parse(fs.readFileSync(biometricFilePath, 'utf-8'));
    if (!data[dbPath]) return { ok: false, error: 'Vault not enrolled' };
    const encrypted = Buffer.from(data[dbPath], 'base64');
    const masterPassword = safeStorage.decryptString(encrypted);
    createController();
    await controller!.unlock(dbPath, masterPassword);
    currentDbPath = dbPath;
    const cfg = readConfig() || {} as AppConfig;
    cfg.lastOpenedDatabaseFile = dbPath;
    writeConfig(cfg);
    mainWindow?.setTitle('passwordPlease — ' + path.basename(dbPath));
    startLockTimer();
    return { ok: true };
  } catch (err: any) {
    if (err.message?.includes('canceled') || err.message?.includes('Cancel')) return { ok: false, error: 'canceled' };
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('biometric:remove', (_e: IpcMainInvokeEvent, { dbPath }: { dbPath: string }) => {
  try {
    if (!fs.existsSync(biometricFilePath)) return { ok: true };
    const data = JSON.parse(fs.readFileSync(biometricFilePath, 'utf-8'));
    delete data[dbPath];
    fs.writeFileSync(biometricFilePath, JSON.stringify(data, null, 2));
    const cfg = readConfig() || {} as AppConfig;
    cfg.biometricEnabled = false;
    writeConfig(cfg);
    return { ok: true };
  } catch (err: any) { return { ok: false, error: err.message }; }
});

// macOS: set app name for menu bar + Dock icon
if (process.platform === 'darwin') {
  app.name = 'passwordPlease';
}

app.whenReady().then(() => {
  const got = app.requestSingleInstanceLock();
  if (!got) { app.quit(); return; }
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  ensureConfig();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('browser-window-focus', () => {
  if (controller?.isUnlocked()) startLockTimer();
});
