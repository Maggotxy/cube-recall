const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // 应用配置
  getAppConfig: () => ipcRenderer.invoke('app:getConfig'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // 机器码
  getMachineId: () => ipcRenderer.invoke('machine:getId'),

  // Java 管理
  detectJava: () => ipcRenderer.invoke('java:detect'),
  installJava: () => ipcRenderer.invoke('java:install'),
  onJavaProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('java:progress', handler)
    return () => ipcRenderer.removeListener('java:progress', handler)
  },

  // 游戏管理
  getMinecraftDir: () => ipcRenderer.invoke('game:getMinecraftDir'),
  isGameInstalled: () => ipcRenderer.invoke('game:isInstalled'),
  onGameProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('game:progress', handler)
    return () => ipcRenderer.removeListener('game:progress', handler)
  },
  onGameLog: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('game:log', handler)
    return () => ipcRenderer.removeListener('game:log', handler)
  },

  // Mod 同步
  syncMods: (serverUrl) => ipcRenderer.invoke('mods:sync', { serverUrl }),
  checkMods: (serverUrl) => ipcRenderer.invoke('mods:check', { serverUrl }),
  onModsProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('mods:progress', handler)
    return () => ipcRenderer.removeListener('mods:progress', handler)
  },

  // 通用多文件夹同步
  checkSync: (serverUrl) => ipcRenderer.invoke('sync:check', { serverUrl }),
  syncMultiFolder: (serverUrl) => ipcRenderer.invoke('sync:multiFolder', { serverUrl }),
  onSyncProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('sync:progress', handler)
    return () => ipcRenderer.removeListener('sync:progress', handler)
  },

  // 环境准备（不启动游戏）
  prepareEnvironment: (serverUrl) =>
    ipcRenderer.invoke('game:prepareEnvironment', { serverUrl }),
  onPrepareProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('prepare:progress', handler)
    return () => ipcRenderer.removeListener('prepare:progress', handler)
  },

  // 启动游戏（环境已准备好后调用）
  launchGame: (username, token, serverIp) =>
    ipcRenderer.invoke('game:launch', { username, token, serverIp }),
  onLaunchProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('launch:progress', handler)
    return () => ipcRenderer.removeListener('launch:progress', handler)
  },

  // 自动更新
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('updater:available', handler)
    return () => ipcRenderer.removeListener('updater:available', handler)
  },
  onUpdateProgress: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('updater:progress', handler)
    return () => ipcRenderer.removeListener('updater:progress', handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('updater:downloaded', handler)
    return () => ipcRenderer.removeListener('updater:downloaded', handler)
  },
  onUpdateError: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('updater:error', handler)
    return () => ipcRenderer.removeListener('updater:error', handler)
  },
})
