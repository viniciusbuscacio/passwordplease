'use strict';

// Type declarations for the API exposed by preload.ts via contextBridge
interface VaultApi {
  create: (dbPath: string, masterPassword: string) => Promise<{ ok: boolean; error?: string }>;
  unlock: (dbPath: string, masterPassword: string) => Promise<{ ok: boolean; error?: string }>;
  lock: () => Promise<{ ok: boolean }>;
  status: () => Promise<{ unlocked: boolean; dbPath: string | null }>;
  onLocked: (callback: (...args: any[]) => void) => void;
}

interface SecretsApi {
  list: () => Promise<{ ok: boolean; secrets?: ListedSecretView[]; duplicates?: string[]; error?: string }>;
  get: (title: string) => Promise<{ ok: boolean; secret?: SecretView; error?: string }>;
  set: (data: any, existingId?: string) => Promise<{ ok: boolean; error?: string }>;
  delete: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

interface DialogApi {
  openFile: () => Promise<string | null>;
  saveFile: () => Promise<string | null>;
}

interface ConfigApi {
  get: () => Promise<AppConfigView | null>;
  set: (settings: Partial<AppConfigView>) => Promise<{ ok: boolean }>;
}

interface BiometricApi {
  available: () => Promise<boolean>;
  enrolled: (dbPath: string) => Promise<boolean>;
  enroll: (dbPath: string, masterPassword: string) => Promise<{ ok: boolean; error?: string }>;
  authenticate: (dbPath: string) => Promise<{ ok: boolean; error?: string }>;
  remove: (dbPath: string) => Promise<{ ok: boolean; error?: string }>;
}

interface WindowApi {
  vault: VaultApi;
  secrets: SecretsApi;
  dialog: DialogApi;
  config: ConfigApi;
  biometric: BiometricApi;
}

interface ListedSecretView {
  id: string;
  title: string;
  username: string | null;
  categoryId: string | null;
  url?: string;
}

interface SecretView {
  id: string;
  title: string;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  categoryId: string | null;
}

interface AppConfigView {
  timerToLock: number;
  timerToLockEnabled: boolean;
  timerToLockUnit: string;
  lastOpenedDatabaseFile: string | null;
  lockOnMinimize: boolean;
  closeToTray: boolean;
  generatePasswordSize: number;
  biometricEnabled?: boolean;
}

interface Window {
  api: WindowApi;
}

// ── State ──────────────────────────────────────────────
let allSecrets: ListedSecretView[] = [];
let currentSecret: SecretView | null = null;
let pendingDbPath: string | null = null;
let generatePasswordSize = 16;

// ── View management ────────────────────────────────────
function showView(id: string): void {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id)!.classList.add('active');

  const lockWrap = document.getElementById('btn-lock-wrap')!;
  if (id === 'view-list' || id === 'view-edit' || id === 'view-detail') {
    lockWrap.classList.remove('d-none');
  } else {
    lockWrap.classList.add('d-none');
  }
}

// ── Theme toggle ───────────────────────────────────────
function initTheme(): void {
  const saved = localStorage.getItem('pp-theme');
  const prefer = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(prefer);
}

function setTheme(theme: string): void {
  document.documentElement.setAttribute('data-bs-theme', theme);
  localStorage.setItem('pp-theme', theme);
  const icon = document.querySelector('#btn-theme i')!;
  icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
  const label = document.getElementById('theme-label');
  if (label) label.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

document.getElementById('btn-theme')!.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-bs-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Password visibility toggle ─────────────────────────
function togglePwVis(inputId: string, btn: HTMLElement): void {
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (input.type === 'password') {
    input.type = 'text';
    btn.querySelector('i')!.className = 'bi bi-eye-slash';
  } else {
    input.type = 'password';
    btn.querySelector('i')!.className = 'bi bi-eye';
  }
}
(window as any).togglePwVis = togglePwVis;

// ── Toast ──────────────────────────────────────────────
function toast(msg: string): void {
  const t = document.getElementById('toast')!;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Password generator ─────────────────────────────────
function generatePassword(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:<>,.?';
  let pw = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    pw += chars[array[i] % chars.length];
  }
  return pw;
}

// ── Welcome view ───────────────────────────────────────
document.getElementById('btn-open-vault')!.addEventListener('click', async () => {
  const filePath = await window.api.dialog.openFile();
  if (!filePath) return;
  pendingDbPath = filePath;
  await prepareUnlockView(filePath);
});

document.getElementById('btn-create-vault')!.addEventListener('click', async () => {
  const filePath = await window.api.dialog.saveFile();
  if (!filePath) return;
  pendingDbPath = filePath;
  document.getElementById('create-dbpath')!.textContent = filePath;
  (document.getElementById('create-password') as HTMLInputElement).value = '';
  (document.getElementById('create-confirm') as HTMLInputElement).value = '';
  document.getElementById('create-mismatch')!.classList.add('d-none');
  (document.getElementById('btn-create-submit') as HTMLButtonElement).disabled = true;
  showView('view-create');
  (document.getElementById('create-password') as HTMLInputElement).focus();
});

document.getElementById('btn-open-last')!.addEventListener('click', async () => {
  const cfg = await window.api.config.get();
  if (!cfg?.lastOpenedDatabaseFile) return;
  pendingDbPath = cfg.lastOpenedDatabaseFile;
  await prepareUnlockView(pendingDbPath);
});

async function prepareUnlockView(dbPath: string): Promise<void> {
  document.getElementById('unlock-dbpath')!.textContent = dbPath;
  (document.getElementById('unlock-password') as HTMLInputElement).value = '';
  document.getElementById('unlock-error')!.classList.add('d-none');
  showView('view-unlock');

  const btnTouchId = document.getElementById('btn-touchid')!;
  const canBiometric = await window.api.biometric.available();
  const isEnrolled = canBiometric && await window.api.biometric.enrolled(dbPath);

  if (isEnrolled) {
    btnTouchId.classList.remove('d-none');
    triggerTouchId(dbPath);
  } else {
    btnTouchId.classList.add('d-none');
    (document.getElementById('unlock-password') as HTMLInputElement).focus();
  }
}

async function triggerTouchId(dbPath: string): Promise<void> {
  const result = await window.api.biometric.authenticate(dbPath);
  if (result.ok) {
    await loadSecretsList();
  } else if (result.error !== 'canceled') {
    document.getElementById('btn-touchid')!.classList.add('d-none');
    document.getElementById('unlock-error')!.textContent = 'Touch ID failed — please enter password.';
    document.getElementById('unlock-error')!.classList.remove('d-none');
    (document.getElementById('unlock-password') as HTMLInputElement).focus();
  } else {
    (document.getElementById('unlock-password') as HTMLInputElement).focus();
  }
}

document.getElementById('btn-touchid')!.addEventListener('click', () => {
  if (pendingDbPath) triggerTouchId(pendingDbPath);
});

// ── Unlock form ────────────────────────────────────────
document.getElementById('form-unlock')!.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const pw = (document.getElementById('unlock-password') as HTMLInputElement).value;
  const result = await window.api.vault.unlock(pendingDbPath!, pw);
  if (result.ok) {
    await offerBiometricEnrollment(pendingDbPath!, pw);
    await loadSecretsList();
  } else {
    document.getElementById('unlock-error')!.textContent = 'Incorrect master password.';
    document.getElementById('unlock-error')!.classList.remove('d-none');
    (document.getElementById('unlock-password') as HTMLInputElement).select();
  }
});

async function offerBiometricEnrollment(dbPath: string, masterPassword: string): Promise<void> {
  const canBiometric = await window.api.biometric.available();
  if (!canBiometric) return;
  const isEnrolled = await window.api.biometric.enrolled(dbPath);
  if (isEnrolled) {
    await window.api.biometric.enroll(dbPath, masterPassword);
    return;
  }
  if (confirm('Enable Touch ID to unlock this vault next time?')) {
    await window.api.biometric.enroll(dbPath, masterPassword);
    toast('Touch ID enabled');
  }
}

document.getElementById('btn-unlock-back')!.addEventListener('click', () => showView('view-welcome'));

// ── Create form ────────────────────────────────────────
function validateCreateForm(): void {
  const pw = (document.getElementById('create-password') as HTMLInputElement).value;
  const confirmVal = (document.getElementById('create-confirm') as HTMLInputElement).value;
  const match = pw === confirmVal && pw.length > 0;
  document.getElementById('create-mismatch')!.classList.toggle('d-none', match || confirmVal.length === 0);
  (document.getElementById('btn-create-submit') as HTMLButtonElement).disabled = !match;

  const bar = document.getElementById('create-strength') as HTMLElement;
  if (pw.length === 0) { bar.style.width = '0'; return; }
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const colors = ['#dc3545', '#dc3545', '#ffc107', '#198754', '#198754'];
  const widths = ['20%', '40%', '60%', '80%', '100%'];
  bar.style.width = widths[Math.min(score, 4)];
  bar.style.background = colors[Math.min(score, 4)];
}

document.getElementById('create-password')!.addEventListener('input', validateCreateForm);
document.getElementById('create-confirm')!.addEventListener('input', validateCreateForm);

document.getElementById('form-create')!.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const pw = (document.getElementById('create-password') as HTMLInputElement).value;
  const result = await window.api.vault.create(pendingDbPath!, pw);
  if (result.ok) {
    await loadSecretsList();
  } else {
    toast('Error: ' + result.error);
  }
});

document.getElementById('btn-create-back')!.addEventListener('click', () => showView('view-welcome'));

// ── Lock button ────────────────────────────────────────
document.getElementById('btn-lock')!.addEventListener('click', async () => {
  await window.api.vault.lock();
  goToWelcome();
});

window.api.vault.onLocked(() => goToWelcome());

function goToWelcome(): void {
  allSecrets = [];
  currentSecret = null;
  setVaultInfo('');
  setVaultInfo('');
  showView('view-welcome');
  checkLastVault();
}

// ── Secrets list ───────────────────────────────────────
async function loadSecretsList(): Promise<void> {
  const result = await window.api.secrets.list();
  if (!result.ok) { toast('Error: ' + result.error); return; }

  allSecrets = (result.secrets || []).sort((a, b) => a.title.localeCompare(b.title));
  renderSecrets(allSecrets);
  updateSecretCount(allSecrets.length);
  showView('view-list');

  if (result.duplicates && result.duplicates.length > 0) {
    toast(`Duplicates found: ${result.duplicates.join(', ')}`);
  }

  const status = await window.api.vault.status();
  if (status.dbPath) {
    const name = status.dbPath.split(/[/\\]/).pop();
    setVaultInfo(`${allSecrets.length} secret${allSecrets.length !== 1 ? 's' : ''} — ${name}`);
  }
}

function updateSecretCount(_count: number): void {
  // Count is now shown in status bar via setVaultInfo()
}

function getSmartIcon(title: string, url?: string | null): string {
  const t = (title || '').toLowerCase();
  const u = (url || '').toLowerCase();
  if (t.includes('database') || t.includes('postgres') || t.includes('mysql') || t.includes('mongo') || t.includes('redis') || t.includes('sql')) return '🗄️';
  if (t.includes('api') || t.includes('token') || t.includes('key')) return '🔑';
  if (t.includes('mercado pago') || t.includes('paypal') || t.includes('stripe') || t.includes('payment')) return '💳';
  if (t.includes('ssh') || t.includes('server') || t.includes('vps') || t.includes('vm')) return '🖥️';
  if (t.includes('email') || t.includes('gmail') || t.includes('smtp')) return '📧';
  if (u && (u.includes('github') || t.includes('github'))) return '🐙';
  if (u) return '🌐';
  return '🔐';
}

function getFaviconUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

function renderSecrets(secrets: ListedSecretView[]): void {
  const container = document.getElementById('secrets-container')!;
  const noSecrets = document.getElementById('no-secrets')!;
  updateSecretCount(secrets.length);

  if (secrets.length === 0) {
    container.innerHTML = '';
    noSecrets.classList.remove('d-none');
    return;
  }

  noSecrets.classList.add('d-none');
  container.innerHTML = secrets.map(s => {
    const icon = getSmartIcon(s.title, s.url);
    const favicon = getFaviconUrl(s.url);
    const iconHtml = favicon
      ? `<img src="${favicon}" width="20" height="20" class="me-2" style="border-radius:4px;vertical-align:middle" onerror="this.outerHTML='<span class=\\'me-2\\'>${icon}</span>'">`
      : `<span class="me-2">${icon}</span>`;
    return `
    <div class="card mb-2 secret-row" data-title="${escHtml(s.title)}">
      <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
        <div style="min-width:0;overflow:hidden">
          ${iconHtml}<strong>${escHtml(s.title)}</strong>
          <small class="text-body-secondary ms-2">${escHtml(s.username || '')}</small>
        </div>
        <div class="secret-actions">
          <button class="btn btn-sm btn-outline-secondary copy-user-btn" data-username="${escHtml(s.username || '')}" title="Copy Username" data-status="Copy the username to clipboard.">
            <i class="bi bi-person"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary copy-pw-btn" data-title="${escHtml(s.title)}" title="Copy Password" data-status="Copy the password to clipboard.">
            <i class="bi bi-clipboard-check"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  container.querySelectorAll('.secret-row').forEach(row => {
    row.addEventListener('click', (e: Event) => {
      if ((e.target as HTMLElement).closest('.copy-pw-btn') || (e.target as HTMLElement).closest('.copy-user-btn')) return;
      openDetail((row as HTMLElement).dataset.title!);
    });
  });

  container.querySelectorAll('.copy-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e: Event) => {
      e.stopPropagation();
      const username = (btn as HTMLElement).dataset.username;
      if (username) {
        await navigator.clipboard.writeText(username);
        toast('Username copied');
      }
    });
  });

  container.querySelectorAll('.copy-pw-btn').forEach(btn => {
    btn.addEventListener('click', async (e: Event) => {
      e.stopPropagation();
      const title = (btn as HTMLElement).dataset.title!;
      const res = await window.api.secrets.get(title);
      if (res.ok && res.secret?.password) {
        await navigator.clipboard.writeText(res.secret.password);
        toast('Password copied!');
      }
    });
  });
}

// Search
document.getElementById('search-input')!.addEventListener('input', (e: Event) => {
  const q = (e.target as HTMLInputElement).value.toLowerCase();
  const filtered = allSecrets.filter(s =>
    s.title.toLowerCase().includes(q) || (s.username || '').toLowerCase().includes(q)
  );
  renderSecrets(filtered);
});

// ── Detail view ────────────────────────────────────────
async function openDetail(title: string): Promise<void> {
  const res = await window.api.secrets.get(title);
  if (!res.ok) { toast('Error: ' + res.error); return; }
  currentSecret = res.secret!;

  document.getElementById('detail-title')!.textContent = currentSecret.title;
  document.getElementById('detail-username')!.textContent = currentSecret.username || '—';
  const detailPw = document.getElementById('detail-password')!;
  detailPw.textContent = '••••••••';
  detailPw.dataset.revealed = 'false';
  document.getElementById('btn-detail-show-pw')!.querySelector('i')!.className = 'bi bi-eye';

  const urlEl = document.getElementById('detail-url') as HTMLAnchorElement;
  if (currentSecret.url) {
    urlEl.textContent = currentSecret.url;
    urlEl.href = currentSecret.url;
  } else {
    urlEl.textContent = '—';
    urlEl.removeAttribute('href');
  }

  document.getElementById('detail-notes')!.textContent = currentSecret.notes || '—';
  showView('view-detail');
}

// Show/hide password in detail
document.getElementById('btn-detail-show-pw')!.addEventListener('click', () => {
  const el = document.getElementById('detail-password')!;
  if (el.dataset.revealed === 'false') {
    el.textContent = currentSecret?.password || '';
    el.dataset.revealed = 'true';
    document.getElementById('btn-detail-show-pw')!.querySelector('i')!.className = 'bi bi-eye-slash';
  } else {
    el.textContent = '••••••••';
    el.dataset.revealed = 'false';
    document.getElementById('btn-detail-show-pw')!.querySelector('i')!.className = 'bi bi-eye';
  }
});

// Copy buttons in detail
document.querySelectorAll('#view-detail .copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const field = (btn as HTMLElement).dataset.field as keyof SecretView;
    if (currentSecret && currentSecret[field]) {
      await navigator.clipboard.writeText(currentSecret[field] as string);
      toast(`${(field as string).charAt(0).toUpperCase() + (field as string).slice(1)} copied!`);
    }
  });
});

document.getElementById('btn-detail-back')!.addEventListener('click', () => {
  showView('view-list');
});

document.getElementById('btn-detail-edit')!.addEventListener('click', () => {
  openEditForm(currentSecret);
});

document.getElementById('btn-detail-delete')!.addEventListener('click', async () => {
  if (!currentSecret) return;
  if (!confirm(`Delete "${currentSecret.title}"?`)) return;
  const res = await window.api.secrets.delete(currentSecret.id);
  if (res.ok) {
    toast('Secret deleted');
    await loadSecretsList();
  } else {
    toast('Error: ' + res.error);
  }
});

// ── Add/Edit form ──────────────────────────────────────
document.getElementById('btn-add-secret')!.addEventListener('click', () => {
  openEditForm(null);
});

function openEditForm(secret: SecretView | null): void {
  const isEdit = !!secret;
  document.getElementById('edit-title-label')!.innerHTML =
    isEdit
      ? '<i class="bi bi-pencil-square me-2"></i>Edit Secret'
      : '<i class="bi bi-plus-circle me-2"></i>Add Secret';

  (document.getElementById('edit-id') as HTMLInputElement).value = isEdit ? secret!.id : '';
  (document.getElementById('edit-title') as HTMLInputElement).value = isEdit ? secret!.title : '';
  (document.getElementById('edit-username') as HTMLInputElement).value = isEdit ? (secret!.username || '') : '';
  (document.getElementById('edit-password') as HTMLInputElement).value = isEdit ? (secret!.password || '') : '';
  (document.getElementById('edit-url') as HTMLInputElement).value = isEdit ? (secret!.url || '') : '';
  (document.getElementById('edit-notes') as HTMLTextAreaElement).value = isEdit ? (secret!.notes || '') : '';

  showView('view-edit');
  (document.getElementById('edit-title') as HTMLInputElement).focus();
}

document.getElementById('btn-generate-pw')!.addEventListener('click', () => {
  (document.getElementById('edit-password') as HTMLInputElement).value = generatePassword(generatePasswordSize);
  const input = document.getElementById('edit-password') as HTMLInputElement;
  if (input.type === 'password') {
    input.type = 'text';
    input.nextElementSibling!.querySelector('i')!.className = 'bi bi-eye-slash';
  }
});

document.getElementById('form-edit')!.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const existingId = (document.getElementById('edit-id') as HTMLInputElement).value || undefined;
  const data = {
    title: (document.getElementById('edit-title') as HTMLInputElement).value.trim(),
    username: (document.getElementById('edit-username') as HTMLInputElement).value.trim(),
    password: (document.getElementById('edit-password') as HTMLInputElement).value,
    url: (document.getElementById('edit-url') as HTMLInputElement).value.trim(),
    notes: (document.getElementById('edit-notes') as HTMLTextAreaElement).value.trim()
  };

  if (!data.title) { toast('Title is required'); return; }

  const res = await window.api.secrets.set(data, existingId);
  if (res.ok) {
    toast(existingId ? 'Secret updated' : 'Secret added');
    await loadSecretsList();
  } else {
    toast('Error: ' + res.error);
  }
});

document.getElementById('btn-edit-cancel')!.addEventListener('click', async () => {
  const status = await window.api.vault.status();
  showView(status.unlocked ? 'view-list' : 'view-welcome');
});

// ── Settings ───────────────────────────────────────────
document.getElementById('btn-settings')!.addEventListener('click', async () => {
  const cfg = await window.api.config.get();
  if (cfg) {
    (document.getElementById('settings-autolock-enabled') as HTMLInputElement).checked = cfg.timerToLockEnabled ?? true;
    (document.getElementById('settings-autolock-time') as HTMLInputElement).value = String(cfg.timerToLock ?? 5);
    (document.getElementById('settings-autolock-unit') as HTMLSelectElement).value = cfg.timerToLockUnit ?? 'minutes';
    (document.getElementById('settings-lock-minimize') as HTMLInputElement).checked = cfg.lockOnMinimize ?? true;
    (document.getElementById('settings-close-tray') as HTMLInputElement).checked = cfg.closeToTray ?? true;
    (document.getElementById('settings-pw-length') as HTMLInputElement).value = String(cfg.generatePasswordSize ?? 16);
  }
  const canBiometric = await window.api.biometric.available();
  const touchIdGroup = document.getElementById('settings-touchid-group')!;
  if (canBiometric) {
    touchIdGroup.classList.remove('d-none');
    (document.getElementById('settings-touchid') as HTMLInputElement).checked = cfg?.biometricEnabled ?? false;
  } else {
    touchIdGroup.classList.add('d-none');
  }
  showView('view-settings');
});

document.getElementById('form-settings')!.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const settings: Partial<AppConfigView> = {
    timerToLockEnabled: (document.getElementById('settings-autolock-enabled') as HTMLInputElement).checked,
    timerToLock: parseInt((document.getElementById('settings-autolock-time') as HTMLInputElement).value) || 5,
    timerToLockUnit: (document.getElementById('settings-autolock-unit') as HTMLSelectElement).value,
    lockOnMinimize: (document.getElementById('settings-lock-minimize') as HTMLInputElement).checked,
    closeToTray: (document.getElementById('settings-close-tray') as HTMLInputElement).checked,
    generatePasswordSize: parseInt((document.getElementById('settings-pw-length') as HTMLInputElement).value) || 16
  };
  generatePasswordSize = settings.generatePasswordSize!;
  await window.api.config.set(settings);

  const touchIdChecked = (document.getElementById('settings-touchid') as HTMLInputElement).checked;
  const canBiometric = await window.api.biometric.available();
  if (canBiometric) {
    const status = await window.api.vault.status();
    if (!touchIdChecked && status.dbPath) {
      await window.api.biometric.remove(status.dbPath);
    }
  }

  toast('Settings saved');

  const status = await window.api.vault.status();
  showView(status.unlocked ? 'view-list' : 'view-welcome');
});

document.getElementById('btn-settings-cancel')!.addEventListener('click', async () => {
  const status = await window.api.vault.status();
  showView(status.unlocked ? 'view-list' : 'view-welcome');
});

// ── Helpers ────────────────────────────────────────────
function escHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Init ───────────────────────────────────────────────
async function checkLastVault(): Promise<void> {
  const cfg = await window.api.config.get();
  const btn = document.getElementById('btn-open-last')!;
  if (cfg?.lastOpenedDatabaseFile) {
    btn.classList.remove('d-none');
    btn.querySelector('i')!.nextSibling!.textContent = ' ' + cfg.lastOpenedDatabaseFile.split(/[/\\]/).pop();
  } else {
    btn.classList.add('d-none');
  }
}

// ── Status bar ─────────────────────────────────────────
const statusText = document.getElementById('status-text');
const statusVault = document.getElementById('status-vault');
function setStatus(msg: string): void { if (statusText) statusText.textContent = msg; }
function setVaultInfo(info: string): void { if (statusVault) statusVault.textContent = info; }
document.addEventListener('mouseover', (e: MouseEvent) => {
  const el = (e.target as HTMLElement).closest('[data-status]') as HTMLElement | null;
  if (el) setStatus(el.dataset.status!);
});
document.addEventListener('mouseout', (e: MouseEvent) => {
  const el = (e.target as HTMLElement).closest('[data-status]') as HTMLElement | null;
  if (el) setStatus('Ready');
});

(async function init(): Promise<void> {
  initTheme();
  await checkLastVault();
  const cfg = await window.api.config.get();
  if (cfg?.generatePasswordSize) generatePasswordSize = cfg.generatePasswordSize;
})();
