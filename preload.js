const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('phantom', {
  login: (username, password, remember) =>
    ipcRenderer.invoke('steam:login', { username, password, remember }),
  submitGuardCode: (code) =>
    ipcRenderer.invoke('steam:submit-guard', code),
  startFarm: (gameIds) =>
    ipcRenderer.invoke('steam:start-farm', gameIds),
  stopFarm: () =>
    ipcRenderer.invoke('steam:stop-farm'),
  logout: () =>
    ipcRenderer.invoke('steam:logout'),
  getStatus: () =>
    ipcRenderer.invoke('steam:get-status'),
  searchGames: (query) =>
    ipcRenderer.invoke('steam:search-games', query),

  getGames: () =>
    ipcRenderer.invoke('settings:get-games'),
  saveGames: (games) =>
    ipcRenderer.invoke('settings:save-games', games),
  getCredentials: () =>
    ipcRenderer.invoke('settings:get-credentials'),
  getLanguage: () =>
    ipcRenderer.invoke('settings:get-language'),
  setLanguage: (lang) =>
    ipcRenderer.invoke('settings:set-language', lang),
  getFarmHours: () =>
    ipcRenderer.invoke('settings:get-farm-hours'),

  onGuardRequired: (callback) =>
    ipcRenderer.on('steam:guard-required', (_e, data) => callback(data)),
  onFarmTick: (callback) =>
    ipcRenderer.on('steam:farm-tick', (_e, data) => callback(data)),
  onFarmingStopped: (callback) =>
    ipcRenderer.on('steam:farming-stopped', (_e) => callback()),
  onDisconnected: (callback) =>
    ipcRenderer.on('steam:disconnected', (_e, data) => callback(data)),

  minimizeWindow: () =>
    ipcRenderer.send('window:minimize'),
  closeWindow: () =>
    ipcRenderer.send('window:close')
});
