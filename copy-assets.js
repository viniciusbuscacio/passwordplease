// copy-assets.js — copies non-TS files to build directory
const fs = require('fs');
const path = require('path');

const assets = [
  { from: 'src/adapters/electron/index.html', to: 'out/adapters/electron/index.html' }
];

for (const { from, to } of assets) {
  const dir = path.dirname(to);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`✅ ${from} → ${to}`);
}
