'use strict';

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  vault: {
    create: (dbPath: string, masterPassword: string) => ipcRenderer.invoke('vault:create', { dbPath, masterPassword }),
    unlock: (dbPath: string, masterPassword: string) => ipcRenderer.invoke('vault:unlock', { dbPath, masterPassword }),
    lock: () => ipcRenderer.invoke('vault:lock'),
    status: () => ipcRenderer.invoke('vault:status'),
    onLocked: (callback: (...args: any[]) => void) => ipcRenderer.on('vault-locked', callback)
  },
  secrets: {
    list: () => ipcRenderer.invoke('secrets:list'),
    get: (title: string) => ipcRenderer.invoke('secrets:get', { title }),
    set: (data: any, existingId?: string) => ipcRenderer.invoke('secrets:set', { data, existingId }),
    delete: (id: string) => ipcRenderer.invoke('secrets:delete', { id })
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: () => ipcRenderer.invoke('dialog:saveFile')
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (settings: any) => ipcRenderer.invoke('config:set', settings)
  },
  biometric: {
    available: () => ipcRenderer.invoke('biometric:available'),
    enrolled: (dbPath: string) => ipcRenderer.invoke('biometric:enrolled', { dbPath }),
    enroll: (dbPath: string, masterPassword: string) => ipcRenderer.invoke('biometric:enroll', { dbPath, masterPassword }),
    authenticate: (dbPath: string) => ipcRenderer.invoke('biometric:authenticate', { dbPath }),
    remove: (dbPath: string) => ipcRenderer.invoke('biometric:remove', { dbPath })
  }
});
