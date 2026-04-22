// post-build.js — runs after npm install
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// macOS: patch Electron.app name in menu bar (dev mode only)
if (process.platform === 'darwin') {
  const plist = path.join(__dirname, 'node_modules/electron/dist/Electron.app/Contents/Info.plist');
  if (fs.existsSync(plist)) {
    try {
      execSync(`/usr/libexec/PlistBuddy -c 'Set :CFBundleName passwordPlease' '${plist}'`);
      execSync(`/usr/libexec/PlistBuddy -c 'Set :CFBundleDisplayName passwordPlease' '${plist}'` +
        ` 2>/dev/null || /usr/libexec/PlistBuddy -c 'Add :CFBundleDisplayName string passwordPlease' '${plist}'`);
      console.log('✅ Patched Electron.app menu name → passwordPlease');
    } catch { console.log('⚠️ Could not patch Electron.app plist'); }
  }
}
