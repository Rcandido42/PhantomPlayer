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
  startFarm: (gameIds, options = {}) => ipcRenderer.invoke('steam:start-farm', { gameIds, options }),
  stopFarm: () => ipcRenderer.invoke('steam:stop-farm'),
  emergencyStop: () => ipcRenderer.invoke('steam:emergency-stop'),
  logout: () => ipcRenderer.invoke('steam:logout'),
  getStatus: () => ipcRenderer.invoke('steam:get-status'),
  searchGames: (query) => ipcRenderer.invoke('steam:search-games', query),
  getOwnedGames: () => ipcRenderer.invoke('steam:get-owned-games'),
  autoLogin: () => ipcRenderer.invoke('steam:auto-login'),

  // Settings
  getGames: () => ipcRenderer.invoke('settings:get-games'),
  saveGames: (games) => ipcRenderer.invoke('settings:save-games', games),
  getCredentials: () => ipcRenderer.invoke('settings:get-credentials'),
  getLanguage: () => ipcRenderer.invoke('settings:get-language'),
  setLanguage: (lang) => ipcRenderer.invoke('settings:set-language', lang),
  getFarmHours: () => ipcRenderer.invoke('settings:get-farm-hours'),
  getTheme: () => ipcRenderer.invoke('settings:get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('settings:set-theme', theme),
  getRunOnStartup: () => ipcRenderer.invoke('settings:get-run-on-startup'),
  setRunOnStartup: (val) => ipcRenderer.invoke('settings:set-run-on-startup', val),
  getAutoStartFarm: () => ipcRenderer.invoke('settings:get-auto-start-farm'),
  setAutoStartFarm: (val) => ipcRenderer.invoke('settings:set-auto-start-farm', val),
  getFarmOptions: () => ipcRenderer.invoke('settings:get-farm-options'),
  setFarmOptions: (options) => ipcRenderer.invoke('settings:set-farm-options', options),
  getGoals: () => ipcRenderer.invoke('settings:get-goals'),
  setGoal: (appId, hours) => ipcRenderer.invoke('settings:set-goal', appId, hours),
  removeGoal: (appId) => ipcRenderer.invoke('settings:remove-goal', appId),
  getGameTimers: () => ipcRenderer.invoke('settings:get-game-timers'),
  setGameTimer: (appId, minutes) => ipcRenderer.invoke('settings:set-game-timer', appId, minutes),
  getWeeklyHours: () => ipcRenderer.invoke('settings:get-weekly-hours'),
  getRotationEnabled: () => ipcRenderer.invoke('settings:get-rotation-enabled'),
  setRotationEnabled: (val) => ipcRenderer.invoke('settings:set-rotation-enabled', val),
  getRotationInterval: () => ipcRenderer.invoke('settings:get-rotation-interval'),
  setRotationInterval: (val) => ipcRenderer.invoke('settings:set-rotation-interval', val),
  getUnlockedAchievements: () => ipcRenderer.invoke('settings:get-unlocked-achievements'),
  unlockAchievement: (id) => ipcRenderer.invoke('settings:unlock-achievement', id),
  getProfiles: () => ipcRenderer.invoke('settings:get-profiles'),
  saveProfile: (profile) => ipcRenderer.invoke('settings:save-profile', profile),
  deleteProfile: (id) => ipcRenderer.invoke('settings:delete-profile', id),
  getSessions: () => ipcRenderer.invoke('settings:get-sessions'),
  clearSessions: () => ipcRenderer.invoke('settings:clear-sessions'),

  // Blacklist
  getBlacklist: () => ipcRenderer.invoke('settings:get-blacklist'),
  addToBlacklist: (appId) => ipcRenderer.invoke('settings:add-to-blacklist', appId),
  removeFromBlacklist: (appId) => ipcRenderer.invoke('settings:remove-from-blacklist', appId),

  // App
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  getSecurityInfo: () => ipcRenderer.invoke('app:get-security-info'),
  exportData: (format) => ipcRenderer.invoke('app:export-data', format),
  importData: () => ipcRenderer.invoke('app:import-data'),
  clearAllData: () => ipcRenderer.invoke('app:clear-all-data'),

  // Card Advisor
  getCardRecommendations: () => ipcRenderer.invoke('steam:get-card-recommendations'),
  startCardQueue: (recommendations) => ipcRenderer.invoke('steam:start-card-queue', recommendations),
  onCardScanProgress: (cb) => ipcRenderer.on('app:card-scan-progress', (_e, data) => cb(data)),

  // Events
  onFarmTick: (cb) => ipcRenderer.on('steam:farm-tick', (_e, data) => cb(data)),
  onFarmingStarted: (cb) => ipcRenderer.on('steam:farming-started', (_e, data) => cb(data)),
  onFarmingStopped: (cb) => ipcRenderer.on('steam:farming-stopped', (_e, data) => cb(data)),
  onFarmStatus: (cb) => ipcRenderer.on('steam:farm-status', (_e, data) => cb(data)),
  onDisconnected: (cb) => ipcRenderer.on('steam:disconnected', (_e, data) => cb(data)),
  onConnectionState: (cb) => ipcRenderer.on('steam:connection-state', (_e, data) => cb(data)),
  onReconnectFailed: (cb) => ipcRenderer.on('steam:reconnect-failed', (_e, data) => cb(data)),
  onCardQueueUpdated: (cb) => ipcRenderer.on('steam:card-queue-updated', (_e, data) => cb(data)),
  onLog: (cb) => ipcRenderer.on('app:log', (_e, data) => cb(data)),
  onAchievementUnlocked: (cb) => ipcRenderer.on('app:achievement-unlocked', (_e, data) => cb(data)),

  // Window
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close')
});
