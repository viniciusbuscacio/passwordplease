npm cache clean --force

$env:DEBUG='electron-builder'; electron-builder build --windows

node post-build.js