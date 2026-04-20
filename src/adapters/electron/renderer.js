'use strict';

// ── State ──────────────────────────────────────────────
let allSecrets = [];
let currentSecret = null; // for detail view
let pendingDbPath = null; // for create/unlock flow
let generatePasswordSize = 16;

// ── View management ────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  // Show/hide lock button
  const lockBtn = document.getElementById('btn-lock');
  if (id === 'view-list' || id === 'view-edit' || id === 'view-detail') {
    lockBtn.classList.remove('d-none');
  } else {
    lockBtn.classList.add('d-none');
  }
}

// ── Theme toggle ───────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('pp-theme');
  const prefer = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(prefer);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  localStorage.setItem('pp-theme', theme);
  const icon = document.querySelector('#btn-theme i');
  icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
}

document.getElementById('btn-theme').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-bs-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Password visibility toggle ─────────────────────────
function togglePwVis(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.querySelector('i').className = 'bi bi-eye-slash';
  } else {
    input.type = 'password';
    btn.querySelector('i').className = 'bi bi-eye';
  }
}
// Expose globally for onclick handlers
window.togglePwVis = togglePwVis;

// ── Toast ──────────────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Password generator ─────────────────────────────────
function generatePassword(length) {
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
document.getElementById('btn-open-vault').addEventListener('click', async () => {
  const filePath = await window.api.dialog.openFile();
  if (!filePath) return;
  pendingDbPath = filePath;
  document.getElementById('unlock-dbpath').textContent = filePath;
  document.getElementById('unlock-password').value = '';
  document.getElementById('unlock-error').classList.add('d-none');
  showView('view-unlock');
  document.getElementById('unlock-password').focus();
});

document.getElementById('btn-create-vault').addEventListener('click', async () => {
  const filePath = await window.api.dialog.saveFile();
  if (!filePath) return;
  pendingDbPath = filePath;
  document.getElementById('create-dbpath').textContent = filePath;
  document.getElementById('create-password').value = '';
  document.getElementById('create-confirm').value = '';
  document.getElementById('create-mismatch').classList.add('d-none');
  document.getElementById('btn-create-submit').disabled = true;
  showView('view-create');
  document.getElementById('create-password').focus();
});

document.getElementById('btn-open-last').addEventListener('click', async () => {
  const cfg = await window.api.config.get();
  if (!cfg?.lastOpenedDatabaseFile) return;
  pendingDbPath = cfg.lastOpenedDatabaseFile;
  document.getElementById('unlock-dbpath').textContent = pendingDbPath;
  document.getElementById('unlock-password').value = '';
  document.getElementById('unlock-error').classList.add('d-none');
  showView('view-unlock');
  document.getElementById('unlock-password').focus();
});

// ── Unlock form ────────────────────────────────────────
document.getElementById('form-unlock').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('unlock-password').value;
  const result = await window.api.vault.unlock(pendingDbPath, pw);
  if (result.ok) {
    await loadSecretsList();
  } else {
    document.getElementById('unlock-error').classList.remove('d-none');
    document.getElementById('unlock-password').select();
  }
});

document.getElementById('btn-unlock-back').addEventListener('click', () => showView('view-welcome'));

// ── Create form ────────────────────────────────────────
function validateCreateForm() {
  const pw = document.getElementById('create-password').value;
  const confirm = document.getElementById('create-confirm').value;
  const match = pw === confirm && pw.length > 0;
  document.getElementById('create-mismatch').classList.toggle('d-none', match || confirm.length === 0);
  document.getElementById('btn-create-submit').disabled = !match;

  // Strength bar
  const bar = document.getElementById('create-strength');
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

document.getElementById('create-password').addEventListener('input', validateCreateForm);
document.getElementById('create-confirm').addEventListener('input', validateCreateForm);

document.getElementById('form-create').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('create-password').value;
  const result = await window.api.vault.create(pendingDbPath, pw);
  if (result.ok) {
    await loadSecretsList();
  } else {
    toast('Error: ' + result.error);
  }
});

document.getElementById('btn-create-back').addEventListener('click', () => showView('view-welcome'));

// ── Lock button ────────────────────────────────────────
document.getElementById('btn-lock').addEventListener('click', async () => {
  await window.api.vault.lock();
  goToWelcome();
});

// Listen for auto-lock from main process
window.api.vault.onLocked(() => goToWelcome());

function goToWelcome() {
  allSecrets = [];
  currentSecret = null;
  document.getElementById('header-dbname').textContent = '';
  showView('view-welcome');
  checkLastVault();
}

// ── Secrets list ───────────────────────────────────────
async function loadSecretsList() {
  const result = await window.api.secrets.list();
  if (!result.ok) { toast('Error: ' + result.error); return; }

  allSecrets = result.secrets || [];
  renderSecrets(allSecrets);
  showView('view-list');

  const status = await window.api.vault.status();
  if (status.dbPath) {
    const name = status.dbPath.split(/[/\\]/).pop();
    document.getElementById('header-dbname').textContent = `— ${name}`;
  }
}

function renderSecrets(secrets) {
  const container = document.getElementById('secrets-container');
  const noSecrets = document.getElementById('no-secrets');

  if (secrets.length === 0) {
    container.innerHTML = '';
    noSecrets.classList.remove('d-none');
    return;
  }

  noSecrets.classList.add('d-none');
  container.innerHTML = secrets.map(s => `
    <div class="card mb-2 secret-row" data-title="${escHtml(s.title)}">
      <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
        <div>
          <strong>${escHtml(s.title)}</strong>
          <small class="text-body-secondary ms-2">${escHtml(s.username || '')}</small>
        </div>
        <div class="secret-actions">
          <button class="btn btn-sm btn-outline-secondary copy-pw-btn" data-title="${escHtml(s.title)}" title="Copy password">
            <i class="bi bi-clipboard-check"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Click on row → detail
  container.querySelectorAll('.secret-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.copy-pw-btn')) return;
      openDetail(row.dataset.title);
    });
  });

  // Quick copy password
  container.querySelectorAll('.copy-pw-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await window.api.secrets.get(btn.dataset.title);
      if (res.ok && res.secret?.password) {
        await navigator.clipboard.writeText(res.secret.password);
        toast('Password copied!');
      }
    });
  });
}

// Search
document.getElementById('search-input').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = allSecrets.filter(s =>
    s.title.toLowerCase().includes(q) || (s.username || '').toLowerCase().includes(q)
  );
  renderSecrets(filtered);
});

// ── Detail view ────────────────────────────────────────
async function openDetail(title) {
  const res = await window.api.secrets.get(title);
  if (!res.ok) { toast('Error: ' + res.error); return; }
  currentSecret = res.secret;

  document.getElementById('detail-title').textContent = currentSecret.title;
  document.getElementById('detail-username').textContent = currentSecret.username || '—';
  document.getElementById('detail-password').textContent = '••••••••';
  document.getElementById('detail-password').dataset.revealed = 'false';
  document.getElementById('btn-detail-show-pw').querySelector('i').className = 'bi bi-eye';

  const urlEl = document.getElementById('detail-url');
  if (currentSecret.url) {
    urlEl.textContent = currentSecret.url;
    urlEl.href = currentSecret.url;
    urlEl.parentElement.parentElement.classList.remove('d-none');
  } else {
    urlEl.parentElement.parentElement.classList.add('d-none');
  }

  document.getElementById('detail-notes').textContent = currentSecret.notes || '—';
  showView('view-detail');
}

// Show/hide password in detail
document.getElementById('btn-detail-show-pw').addEventListener('click', () => {
  const el = document.getElementById('detail-password');
  if (el.dataset.revealed === 'false') {
    el.textContent = currentSecret.password || '';
    el.dataset.revealed = 'true';
    document.getElementById('btn-detail-show-pw').querySelector('i').className = 'bi bi-eye-slash';
  } else {
    el.textContent = '••••••••';
    el.dataset.revealed = 'false';
    document.getElementById('btn-detail-show-pw').querySelector('i').className = 'bi bi-eye';
  }
});

// Copy buttons in detail
document.querySelectorAll('#view-detail .copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const field = btn.dataset.field;
    if (currentSecret && currentSecret[field]) {
      await navigator.clipboard.writeText(currentSecret[field]);
      toast(`${field.charAt(0).toUpperCase() + field.slice(1)} copied!`);
    }
  });
});

document.getElementById('btn-detail-back').addEventListener('click', () => {
  showView('view-list');
});

document.getElementById('btn-detail-edit').addEventListener('click', () => {
  openEditForm(currentSecret);
});

document.getElementById('btn-detail-delete').addEventListener('click', async () => {
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
document.getElementById('btn-add-secret').addEventListener('click', () => {
  openEditForm(null);
});

function openEditForm(secret) {
  const isEdit = !!secret;
  document.getElementById('edit-title-label').innerHTML =
    isEdit
      ? '<i class="bi bi-pencil-square me-2"></i>Edit Secret'
      : '<i class="bi bi-plus-circle me-2"></i>Add Secret';

  document.getElementById('edit-id').value = isEdit ? secret.id : '';
  document.getElementById('edit-title').value = isEdit ? secret.title : '';
  document.getElementById('edit-username').value = isEdit ? (secret.username || '') : '';
  document.getElementById('edit-password').value = isEdit ? (secret.password || '') : generatePassword(generatePasswordSize);
  document.getElementById('edit-url').value = isEdit ? (secret.url || '') : '';
  document.getElementById('edit-notes').value = isEdit ? (secret.notes || '') : '';

  showView('view-edit');
  document.getElementById('edit-title').focus();
}

document.getElementById('btn-generate-pw').addEventListener('click', () => {
  document.getElementById('edit-password').value = generatePassword(generatePasswordSize);
  // Ensure it's visible
  const input = document.getElementById('edit-password');
  if (input.type === 'password') {
    input.type = 'text';
    input.nextElementSibling.querySelector('i').className = 'bi bi-eye-slash';
  }
});

document.getElementById('form-edit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const existingId = document.getElementById('edit-id').value || undefined;
  const data = {
    title: document.getElementById('edit-title').value.trim(),
    username: document.getElementById('edit-username').value.trim(),
    password: document.getElementById('edit-password').value,
    url: document.getElementById('edit-url').value.trim(),
    notes: document.getElementById('edit-notes').value.trim()
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

document.getElementById('btn-edit-cancel').addEventListener('click', async () => {
  const status = await window.api.vault.status();
  if (status.unlocked) {
    showView('view-list');
  } else {
    showView('view-welcome');
  }
});

// ── Settings ───────────────────────────────────────────
document.getElementById('btn-settings').addEventListener('click', async () => {
  const cfg = await window.api.config.get();
  if (cfg) {
    document.getElementById('settings-autolock-enabled').checked = cfg.timerToLockEnabled ?? true;
    document.getElementById('settings-autolock-time').value = cfg.timerToLock ?? 5;
    document.getElementById('settings-autolock-unit').value = cfg.timerToLockUnit ?? 'minutes';
    document.getElementById('settings-lock-minimize').checked = cfg.lockOnMinimize ?? true;
    document.getElementById('settings-close-tray').checked = cfg.closeToTray ?? true;
    document.getElementById('settings-pw-length').value = cfg.generatePasswordSize ?? 16;
  }
  showView('view-settings');
});

document.getElementById('form-settings').addEventListener('submit', async (e) => {
  e.preventDefault();
  const settings = {
    timerToLockEnabled: document.getElementById('settings-autolock-enabled').checked,
    timerToLock: parseInt(document.getElementById('settings-autolock-time').value) || 5,
    timerToLockUnit: document.getElementById('settings-autolock-unit').value,
    lockOnMinimize: document.getElementById('settings-lock-minimize').checked,
    closeToTray: document.getElementById('settings-close-tray').checked,
    generatePasswordSize: parseInt(document.getElementById('settings-pw-length').value) || 16
  };
  generatePasswordSize = settings.generatePasswordSize;
  await window.api.config.set(settings);
  toast('Settings saved');

  const status = await window.api.vault.status();
  showView(status.unlocked ? 'view-list' : 'view-welcome');
});

document.getElementById('btn-settings-cancel').addEventListener('click', async () => {
  const status = await window.api.vault.status();
  showView(status.unlocked ? 'view-list' : 'view-welcome');
});

// ── Helpers ────────────────────────────────────────────
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Init ───────────────────────────────────────────────
async function checkLastVault() {
  const cfg = await window.api.config.get();
  const btn = document.getElementById('btn-open-last');
  if (cfg?.lastOpenedDatabaseFile) {
    btn.classList.remove('d-none');
    btn.querySelector('i').nextSibling.textContent = ' ' + cfg.lastOpenedDatabaseFile.split(/[/\\]/).pop();
  } else {
    btn.classList.add('d-none');
  }
}

(async function init() {
  initTheme();
  await checkLastVault();
  const cfg = await window.api.config.get();
  if (cfg?.generatePasswordSize) generatePasswordSize = cfg.generatePasswordSize;
})();
