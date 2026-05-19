const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('phantom', {
  // QR Login
  startQR: () => ipcRenderer.invoke('steam:start-qr'),
  cancelQR: () => ipcRenderer.invoke('steam:cancel-qr'),
  onQRScanned: (cb) => ipcRenderer.on('steam:qr-scanned', () => cb()),
  onQRAuthenticated: (cb) => ipcRenderer.on('steam:qr-authenticated', (_e, data) => cb(data)),
  onQRTimeout: (cb) => ipcRenderer.on('steam:qr-timeout', () => cb()),
  onQRError: (cb) => ipcRenderer.on('steam:qr-error', (_e, data) => cb(data)),

  // Classic Login
  login: (username, password, remember) => ipcRenderer.invoke('steam:login', { username, password, remember }),
  submitGuardCode: (code) => ipcRenderer.invoke('steam:submit-guard', code),
  onGuardRequired: (cb) => ipcRenderer.on('steam:guard-required', (_e, data) => cb(data)),

  // Farm
  startFarm: (gameIds) => ipcRenderer.invoke('steam:start-farm', gameIds),
  stopFarm: () => ipcRenderer.invoke('steam:stop-farm'),
  logout: () => ipcRenderer.invoke('steam:logout'),
  getStatus: () => ipcRenderer.invoke('steam:get-status'),
  searchGames: (query) => ipcRenderer.invoke('steam:search-games', query),

  // Settings
  getGames: () => ipcRenderer.invoke('settings:get-games'),
  saveGames: (games) => ipcRenderer.invoke('settings:save-games', games),
  getCredentials: () => ipcRenderer.invoke('settings:get-credentials'),
  getLanguage: () => ipcRenderer.invoke('settings:get-language'),
  setLanguage: (lang) => ipcRenderer.invoke('settings:set-language', lang),
  getFarmHours: () => ipcRenderer.invoke('settings:get-farm-hours'),
  getTheme: () => ipcRenderer.invoke('settings:get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('settings:set-theme', theme),

  // Events
  onFarmTick: (cb) => ipcRenderer.on('steam:farm-tick', (_e, data) => cb(data)),
  onFarmingStopped: (cb) => ipcRenderer.on('steam:farming-stopped', () => cb()),
  onDisconnected: (cb) => ipcRenderer.on('steam:disconnected', (_e, data) => cb(data)),

  // Window
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close')
});
