const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const QRCode = require('qrcode');
const { LoginSession, EAuthTokenPlatformType } = require('steam-session');
const SteamClient = require('./src/steam/client');
const CardAdvisor = require('./src/steam/cardAdvisor');
const Settings = require('./src/store/settings');
const { FarmController } = require('./src/farm/controller');

let mainWindow = null;
let tray = null;
let steamClient = null;
let settings = null;
let qrSession = null;
let cardAdvisor = null;
let webSessionCookies = null;
let farmController = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let reconnectMode = false;
let intentionalLogout = false;
let cardQueueTimer = null;
let cardRecommendationsCache = { timestamp: 0, recommendations: [] };
let lastRendererFarmTick = 0;

function logToClient(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:log', { level, message, timestamp });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120, height: 760, minWidth: 760, minHeight: 560, frame: false, resizable: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0a0a0f', show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); } });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  updateTrayMenu();
  tray.setToolTip('PhantomPlayer');
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

function updateTrayMenu() {
  const isFarming = farmController ? farmController.running : false;
  const isLoggedIn = steamClient ? steamClient.isLoggedIn : false;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir PhantomPlayer', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: isFarming ? 'Parar Farm' : 'Iniciar Farm', enabled: isLoggedIn, click: () => {
      if (isFarming) { stopFarming(); } else { const g = settings.getGames(); if (g.length > 0) startFarming(g.map(x => x.appId)); }
    }},
    { type: 'separator' },
    { label: 'Sair', click: () => { app.isQuitting = true; if (steamClient && steamClient.isLoggedIn) steamClient.logout(); app.quit(); } }
  ]));
}

function startFarming(gameIds, options = {}) {
  const result = farmController.start(gameIds, options);
  if (!result.success) logToClient('warn', 'O farm não foi iniciado: nenhum jogo elegível.');
  updateTrayMenu();
  return result;
}

function stopFarming(reason = 'manual') {
  const result = farmController.stop(reason);
  clearCardQueueTimer();
  updateTrayMenu();
  return result;
}

function searchSteamGames(query) {
  return new Promise((resolve) => {
    https.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { try { resolve((JSON.parse(data).items || []).map(i => ({ appId: i.id, name: i.name, icon: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${i.id}/capsule_231x87.jpg` }))); } catch { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data);
}

function scheduleReconnect() {
  if (intentionalLogout || reconnectTimer || steamClient.isLoggedIn) return;
  const token = settings.getRefreshToken();
  if (!token) {
    sendToRenderer('steam:reconnect-failed', { reason: 'no-token' });
    return;
  }
  const delay = Math.min(60000, 1000 * (2 ** Math.min(reconnectAttempts, 6)));
  reconnectAttempts++;
  logToClient('warn', `Ligação perdida. Nova tentativa em ${Math.ceil(delay / 1000)}s...`);
  sendToRenderer('steam:connection-state', { state: 'reconnecting', attempt: reconnectAttempts });
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!intentionalLogout && !steamClient.isLoggedIn) {
      reconnectMode = true;
      steamClient.loginWithToken(token);
    }
  }, delay);
}

function clearReconnectTimer() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

async function getCardRecommendations(force = false) {
  if (!steamClient.isLoggedIn || !webSessionCookies) throw new Error('Sessão web da Steam indisponível');
  const cacheAge = Date.now() - cardRecommendationsCache.timestamp;
  if (!force && cacheAge < 10 * 60 * 1000 && cardRecommendationsCache.recommendations.length) {
    return cardRecommendationsCache.recommendations;
  }
  cardAdvisor.setCookies(webSessionCookies);
  cardAdvisor.setSteamId(steamClient.steamId);
  const ownedGames = await steamClient.getOwnedGames();
  const recommendations = await cardAdvisor.getRecommendations(ownedGames, progress => {
    sendToRenderer('app:card-scan-progress', progress);
  });
  const blacklist = settings.getBlacklist();
  const filtered = recommendations.filter(item => !blacklist.includes(item.appId));
  cardRecommendationsCache = { timestamp: Date.now(), recommendations: filtered };
  return filtered;
}

function clearCardQueueTimer() {
  if (cardQueueTimer) clearInterval(cardQueueTimer);
  cardQueueTimer = null;
}

function scheduleCardQueueRefresh() {
  clearCardQueueTimer();
  const intervalMs = settings.getCardQueueRefreshMinutes() * 60 * 1000;
  cardQueueTimer = setInterval(async () => {
    if (!farmController.running || farmController.getStatus().source !== 'card-queue') {
      clearCardQueueTimer();
      return;
    }
    try {
      const recommendations = await getCardRecommendations(true);
      farmController.updateGames(recommendations.map(item => item.appId));
      sendToRenderer('steam:card-queue-updated', { recommendations });
      if (!recommendations.length) clearCardQueueTimer();
    } catch (error) {
      logToClient('warn', `Fila de cartas: não foi possível atualizar (${error.message}).`);
    }
  }, intervalMs);
}

function sessionsToCsv(sessions) {
  const header = ['inicio', 'fim', 'motivo', 'origem', 'appId', 'horas'];
  const rows = [header.join(',')];
  for (const session of sessions) {
    for (const appId of session.gameIds || []) {
      const values = [session.startedAt, session.endedAt, session.reason, session.source, appId, session.gameHours?.[String(appId)] || 0];
      rows.push(values.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
    }
  }
  return rows.join('\n');
}

function setupIPC() {
  let pendingLogin = null;

  // --- QR Code Login ---
  ipcMain.handle('steam:start-qr', async () => {
    try {
      if (qrSession) {
        qrSession.cancelLoginAttempt();
        qrSession = null;
      }

      qrSession = new LoginSession(EAuthTokenPlatformType.SteamClient);

      qrSession.on('remoteInteraction', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('steam:qr-scanned');
        }
      });

      qrSession.on('authenticated', async () => {
        const refreshToken = qrSession.refreshToken;
        const accountName = qrSession.accountName;
        const steamId = qrSession.steamID.getSteamID64();
        qrSession = null;

        intentionalLogout = false;
        settings.saveRefreshToken(refreshToken);

        steamClient.loginWithToken(refreshToken);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('steam:qr-authenticated', { steamId, accountName });
        }
      });

      qrSession.on('timeout', () => {
        qrSession = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('steam:qr-timeout');
        }
      });

      qrSession.on('error', (err) => {
        qrSession = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('steam:qr-error', { message: err.message });
        }
      });

      const result = await qrSession.startWithQR();
      const qrDataUrl = await QRCode.toDataURL(result.qrChallengeUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#ffffff', light: '#00000000' }
      });

      return { success: true, qrImage: qrDataUrl };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('steam:cancel-qr', async () => {
    if (qrSession) {
      qrSession.cancelLoginAttempt();
      qrSession = null;
    }
    return { success: true };
  });

  // --- Classic Login ---
  ipcMain.handle('steam:login', async (_event, { username, password, remember }) => {
    intentionalLogout = false;
    pendingLogin = { username, password, remember };
    return new Promise((resolve) => {
      const onLogged = (data) => { cleanup(); if (pendingLogin?.remember) settings.saveCredentials(pendingLogin.username, pendingLogin.password); else settings.clearCredentials(); pendingLogin = null; resolve({ success: true, steamId: data.steamId }); };
      const onError = (data) => { cleanup(); pendingLogin = null; resolve({ success: false, error: data.message, eresult: data.eresult }); };
      const onGuard = (data) => { cleanup(); if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('steam:guard-required', data); resolve({ success: false, guard: true }); };
      function cleanup() { steamClient.removeListener('logged-on', onLogged); steamClient.removeListener('error', onError); steamClient.removeListener('guard-required', onGuard); }
      steamClient.on('logged-on', onLogged); steamClient.on('error', onError); steamClient.on('guard-required', onGuard);
      steamClient.login(username, password);
    });
  });

  ipcMain.handle('steam:submit-guard', async (_event, code) => {
    steamClient.submitGuardCode(code);
    return new Promise((resolve) => {
      const onLogged = (data) => { cleanupG(); if (pendingLogin?.remember) settings.saveCredentials(pendingLogin.username, pendingLogin.password); pendingLogin = null; resolve({ success: true, steamId: data.steamId }); };
      const onError = (data) => { cleanupG(); pendingLogin = null; resolve({ success: false, error: data.message, eresult: data.eresult }); };
      function cleanupG() { steamClient.removeListener('logged-on', onLogged); steamClient.removeListener('error', onError); }
      steamClient.on('logged-on', onLogged); steamClient.on('error', onError);
    });
  });

  // --- Farm ---
  ipcMain.handle('steam:start-farm', async (_e, payload) => {
    const gameIds = Array.isArray(payload) ? payload : payload?.gameIds;
    const options = Array.isArray(payload) ? {} : payload?.options || {};
    return startFarming(gameIds, options);
  });
  ipcMain.handle('steam:stop-farm', async () => stopFarming());
  ipcMain.handle('steam:emergency-stop', async () => {
    intentionalLogout = true;
    clearReconnectTimer();
    stopFarming('emergency-stop');
    if (steamClient.isLoggedIn) steamClient.logout();
    settings.clearRefreshToken();
    return { success: true };
  });
  ipcMain.handle('steam:logout', async () => {
    intentionalLogout = true;
    clearReconnectTimer();
    if (farmController.running) stopFarming('logout');
    if (steamClient.isLoggedIn) steamClient.logout();
    settings.clearRefreshToken();
    updateTrayMenu();
    return { success: true };
  });
  ipcMain.handle('steam:get-status', async () => ({ ...steamClient.getStatus(), ...farmController.getStatus() }));
  ipcMain.handle('steam:search-games', async (_e, q) => searchSteamGames(q));

  // --- Settings ---
  ipcMain.handle('settings:get-games', async () => settings.getGames());
  ipcMain.handle('settings:save-games', async (_e, g) => { settings.setGames(g); return { success: true }; });
  ipcMain.handle('settings:get-credentials', async () => settings.getCredentials());
  ipcMain.handle('settings:get-language', async () => settings.getLanguage());
  ipcMain.handle('settings:set-language', async (_e, l) => { settings.setLanguage(l); return { success: true }; });
  ipcMain.handle('settings:get-farm-hours', async () => settings.getFarmHours());
  ipcMain.handle('settings:get-theme', async () => settings.getTheme());
  ipcMain.handle('settings:set-theme', async (_e, t) => { settings.setTheme(t); return { success: true }; });
  ipcMain.handle('settings:get-run-on-startup', async () => settings.getRunOnStartup());
  ipcMain.handle('settings:set-run-on-startup', async (_e, val) => {
    settings.setRunOnStartup(val);
    app.setLoginItemSettings({ openAtLogin: val });
    return { success: true };
  });
  ipcMain.handle('settings:get-auto-start-farm', async () => settings.getAutoStartFarm());
  ipcMain.handle('settings:set-auto-start-farm', async (_e, val) => {
    settings.setAutoStartFarm(val);
    return { success: true };
  });
  ipcMain.handle('settings:get-farm-options', async () => ({
    maxSimultaneousGames: settings.getMaxSimultaneousGames(),
    pauseOnExternalGame: settings.getPauseOnExternalGame(),
    cardQueueRefreshMinutes: settings.getCardQueueRefreshMinutes()
  }));
  ipcMain.handle('settings:set-farm-options', async (_e, options) => {
    settings.setMaxSimultaneousGames(options.maxSimultaneousGames);
    settings.setPauseOnExternalGame(options.pauseOnExternalGame);
    settings.setCardQueueRefreshMinutes(options.cardQueueRefreshMinutes);
    return { success: true };
  });

  // --- Owned Games ---
  ipcMain.handle('steam:get-owned-games', async () => steamClient.getOwnedGames());

  // --- Auto Login ---
  ipcMain.handle('steam:auto-login', async () => {
    const token = settings.getRefreshToken();
    if (!token) return { success: false, reason: 'no-token' };
    intentionalLogout = false;
    return new Promise((resolve) => {
      const onLogged = (data) => { cleanup(); resolve({ success: true, steamId: data.steamId }); };
      const onError = (data) => { cleanup(); settings.clearRefreshToken(); resolve({ success: false, reason: 'token-expired', error: data.message }); };
      function cleanup() { steamClient.removeListener('logged-on', onLogged); steamClient.removeListener('error', onError); }
      steamClient.on('logged-on', onLogged); steamClient.on('error', onError);
      steamClient.loginWithToken(token);
    });
  });

  // --- Goals ---
  ipcMain.handle('settings:get-goals', async () => settings.getGoals());
  ipcMain.handle('settings:set-goal', async (_e, appId, hours) => { settings.setGoal(appId, hours); return { success: true }; });
  ipcMain.handle('settings:remove-goal', async (_e, appId) => { settings.removeGoal(appId); return { success: true }; });
  ipcMain.handle('settings:get-game-timers', async () => settings.getGameTimers());
  ipcMain.handle('settings:set-game-timer', async (_e, appId, minutes) => { settings.setGameTimer(appId, minutes); return { success: true }; });

  // --- Weekly tracking ---
  ipcMain.handle('settings:get-weekly-hours', async () => settings.getWeeklyHours());

  // --- Game Rotation ---
  ipcMain.handle('settings:get-rotation-enabled', async () => settings.getRotationEnabled());
  ipcMain.handle('settings:set-rotation-enabled', async (_e, val) => { settings.setRotationEnabled(val); return { success: true }; });
  ipcMain.handle('settings:get-rotation-interval', async () => settings.getRotationInterval());
  ipcMain.handle('settings:set-rotation-interval', async (_e, val) => { settings.setRotationInterval(val); return { success: true }; });

  // --- Profiles and history ---
  ipcMain.handle('settings:get-profiles', async () => settings.getProfiles());
  ipcMain.handle('settings:save-profile', async (_e, profile) => ({ success: true, profile: settings.saveProfile(profile) }));
  ipcMain.handle('settings:delete-profile', async (_e, id) => ({ success: settings.deleteProfile(id) }));
  ipcMain.handle('settings:get-sessions', async () => settings.getSessions());
  ipcMain.handle('settings:clear-sessions', async () => { settings.clearSessions(); return { success: true }; });

  // --- Achievements ---
  ipcMain.handle('settings:get-unlocked-achievements', async () => settings.getUnlockedAchievements());
  ipcMain.handle('settings:unlock-achievement', async (_e, id) => {
    const newlyUnlocked = settings.unlockAchievement(id);
    if (newlyUnlocked && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:achievement-unlocked', { id });
    }
    return newlyUnlocked;
  });

  // --- Blacklist ---
  ipcMain.handle('settings:get-blacklist', async () => settings.getBlacklist());
  ipcMain.handle('settings:add-to-blacklist', async (_e, appId) => {
    const success = settings.addGameToBlacklist(appId);
    if (success && farmController.running && farmController.gameIds.includes(appId)) {
      farmController.updateGames(farmController.gameIds.filter(id => id !== appId));
    }
    return { success };
  });
  ipcMain.handle('settings:remove-from-blacklist', async (_e, appId) => {
    const success = settings.removeGameFromBlacklist(appId);
    return { success };
  });

  // --- Card Advisor ---
  ipcMain.handle('steam:get-card-recommendations', async () => {
    try {
      return { success: true, recommendations: await getCardRecommendations(true) };
    } catch (err) {
      console.error('Card Advisor error:', err);
      return { error: err.message };
    }
  });
  ipcMain.handle('steam:start-card-queue', async (_e, recommendations) => {
    try {
      const items = Array.isArray(recommendations) && recommendations.length
        ? recommendations
        : await getCardRecommendations(false);
      const result = startFarming(items.map(item => item.appId), {
        rotationEnabled: true,
        rotationIntervalMinutes: settings.getRotationInterval(),
        source: 'card-queue',
        perGameMinutes: {}
      });
      if (result.success) scheduleCardQueueRefresh();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // --- Backup, privacy and security ---
  ipcMain.handle('app:get-security-info', async () => settings.getSecurityInfo());
  ipcMain.handle('app:export-data', async (_e, format = 'json') => {
    const extension = format === 'csv' ? 'csv' : 'json';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar dados do PhantomPlayer',
      defaultPath: `phantom-player-backup.${extension}`,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    const content = format === 'csv'
      ? sessionsToCsv(settings.getSessions())
      : JSON.stringify(settings.getExportData(), null, 2);
    await fs.promises.writeFile(result.filePath, content, 'utf8');
    return { success: true, filePath: result.filePath };
  });
  ipcMain.handle('app:import-data', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar backup do PhantomPlayer',
      properties: ['openFile'],
      filters: [{ name: 'PhantomPlayer JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };
    try {
      const fileStats = await fs.promises.stat(result.filePaths[0]);
      if (fileStats.size > 10 * 1024 * 1024) throw new Error('Backup demasiado grande');
      const parsed = JSON.parse(await fs.promises.readFile(result.filePaths[0], 'utf8'));
      settings.importData(parsed);
      app.setLoginItemSettings({ openAtLogin: settings.getRunOnStartup() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('app:clear-all-data', async () => {
    intentionalLogout = true;
    clearReconnectTimer();
    if (farmController.running) stopFarming('data-cleared');
    if (steamClient.isLoggedIn) steamClient.logout();
    settings.clearAllData();
    app.setLoginItemSettings({ openAtLogin: false });
    return { success: true };
  });

  // --- Auto Update ---
  ipcMain.handle('app:check-for-updates', async () => checkForUpdates());
  ipcMain.handle('app:open-external', async (_e, url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return { success: false, error: 'unsupported-protocol' };
    await shell.openExternal(parsed.toString());
    return { success: true };
  });

  // --- Window ---
  ipcMain.on('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.on('window:close', () => { if (mainWindow) mainWindow.hide(); });
}

function setupSteamEvents() {
  steamClient.on('disconnected', (data) => {
    reconnectMode = false;
    webSessionCookies = null;
    farmController.handleDisconnected();
    updateTrayMenu();
    sendToRenderer('steam:disconnected', { ...data, reconnecting: !intentionalLogout });
    scheduleReconnect();
  });
  
  steamClient.on('logged-on', () => {
    clearReconnectTimer();
    reconnectAttempts = 0;
    reconnectMode = false;
    intentionalLogout = false;
    farmController.handleReconnected();
    sendToRenderer('steam:connection-state', { state: 'online', attempt: 0 });
    if (settings.getAutoStartFarm() && !farmController.running) {
      const g = settings.getGames();
      if (g.length > 0) startFarming(g.map(x => x.appId));
    }
  });

  steamClient.on('error', () => {
    if (reconnectMode && !intentionalLogout) {
      reconnectMode = false;
      farmController.handleDisconnected();
      scheduleReconnect();
    }
  });

  steamClient.on('external-playing', ({ blocked, appId }) => {
    farmController.setExternalGameRunning(blocked, appId);
  });

  // Capture web session cookies for Card Advisor
  steamClient.client.on('webSession', (sessionID, cookies) => {
    webSessionCookies = cookies;
    logToClient('info', 'Sessão web obtida com sucesso.');
  });

  steamClient.on('log', ({ level, message }) => logToClient(level, message));

  farmController.on('started', status => {
    logToClient('success', `Sessão iniciada com ${status.queuedGames.length} jogo(s).`);
    sendToRenderer('steam:farming-started', status);
    updateTrayMenu();
  });
  farmController.on('tick', status => {
    if (Date.now() - lastRendererFarmTick < 15000) return;
    lastRendererFarmTick = Date.now();
    sendToRenderer('steam:farm-tick', { farmHours: settings.getFarmHours(), status });
  });
  farmController.on('status', status => sendToRenderer('steam:farm-status', status));
  farmController.on('rotated', status => {
    logToClient('info', `[Rotação] Jogo ativo: ${status.currentGames.join(', ')}`);
  });
  farmController.on('game-timer-complete', ({ gameIds }) => {
    logToClient('success', `Temporizador concluído para: ${gameIds.join(', ')}`);
  });
  farmController.on('paused', ({ appId }) => {
    logToClient('warn', `Farm pausado porque outro jogo está ativo${appId ? ` (AppID ${appId})` : ''}.`);
  });
  farmController.on('resumed', () => logToClient('success', 'Farm retomado automaticamente.'));
  farmController.on('stopped', ({ reason, session }) => {
    clearCardQueueTimer();
    sendToRenderer('steam:farming-stopped', { reason, session });
    sendToRenderer('steam:farm-tick', { farmHours: settings.getFarmHours(), status: farmController.getStatus() });
    updateTrayMenu();
  });
}

app.whenReady().then(() => { 
  settings = new Settings(); 
  steamClient = new SteamClient();
  cardAdvisor = new CardAdvisor();
  farmController = new FarmController({ steamClient, settings });
  app.setLoginItemSettings({ openAtLogin: settings.getRunOnStartup() });
  createWindow(); 
  createTray(); 
  setupIPC(); 
  setupSteamEvents(); 
});
app.on('window-all-closed', () => {});
app.on('before-quit', () => {
  app.isQuitting = true;
  intentionalLogout = true;
  clearReconnectTimer();
  if (farmController?.running) stopFarming('app-quit');
  if (steamClient?.isLoggedIn) steamClient.logout();
});

function checkForUpdates() {
  const currentVersion = app.getVersion();
  return new Promise((resolve) => {
    https.get('https://api.github.com/repos/Rcandido42/PhantomPlayer/releases/latest', {
      headers: { 'User-Agent': 'PhantomPlayer' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = (release.tag_name || '').replace(/^v/, '');
          if (latestVersion && latestVersion !== currentVersion) {
            resolve({ updateAvailable: true, currentVersion, latestVersion, downloadUrl: release.html_url });
          } else {
            resolve({ updateAvailable: false, currentVersion });
          }
        } catch { resolve({ updateAvailable: false, currentVersion }); }
      });
    }).on('error', () => resolve({ updateAvailable: false, currentVersion }));
  });
}
