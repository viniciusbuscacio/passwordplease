'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  vault: {
    create: (dbPath, masterPassword) => ipcRenderer.invoke('vault:create', { dbPath, masterPassword }),
    unlock: (dbPath, masterPassword) => ipcRenderer.invoke('vault:unlock', { dbPath, masterPassword }),
    lock: () => ipcRenderer.invoke('vault:lock'),
    status: () => ipcRenderer.invoke('vault:status'),
    onLocked: (callback) => ipcRenderer.on('vault-locked', callback)
  },
  secrets: {
    list: () => ipcRenderer.invoke('secrets:list'),
    get: (title) => ipcRenderer.invoke('secrets:get', { title }),
    set: (data, existingId) => ipcRenderer.invoke('secrets:set', { data, existingId }),
    delete: (id) => ipcRenderer.invoke('secrets:delete', { id })
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: () => ipcRenderer.invoke('dialog:saveFile')
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (settings) => ipcRenderer.invoke('config:set', settings)
  }
});
