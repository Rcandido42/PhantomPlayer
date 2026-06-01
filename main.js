const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const https = require('https');
const QRCode = require('qrcode');
const { LoginSession, EAuthTokenPlatformType } = require('steam-session');
const SteamClient = require('./src/steam/client');
const CardAdvisor = require('./src/steam/cardAdvisor');
const Settings = require('./src/store/settings');

let mainWindow = null;
let tray = null;
let steamClient = null;
let settings = null;
let farmInterval = null;
let farmStartTime = null;
let qrSession = null;
let cardAdvisor = null;
let webSessionCookies = null;

let rotationIntervalTimer = null;
let rotationGameIds = [];
let currentRotationIndex = 0;

function logToClient(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:log', { level, message, timestamp });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920, height: 640, frame: false, resizable: false,
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
  const isFarming = steamClient ? steamClient.isFarming : false;
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

function startFarming(gameIds) {
  const rotationEnabled = settings.getRotationEnabled();
  
  if (rotationEnabled && gameIds.length > 0) {
    rotationGameIds = gameIds;
    currentRotationIndex = 0;
    steamClient.startFarm([rotationGameIds[currentRotationIndex]]);
    logToClient('info', `[Rotação] Iniciando farm cíclico. Jogo ativo: ID ${rotationGameIds[currentRotationIndex]}`);
    
    const intervalMs = settings.getRotationInterval() * 60 * 1000;
    rotationIntervalTimer = setInterval(() => {
      if (steamClient.isFarming && rotationGameIds.length > 1) {
        logToClient('info', `[Rotação] Alternando jogo farmado...`);
        
        if (farmStartTime) {
          const elapsed = (Date.now() - farmStartTime) / 3600000;
          steamClient.currentGames.forEach(id => settings.addFarmTime(id, elapsed));
        }
        
        currentRotationIndex = (currentRotationIndex + 1) % rotationGameIds.length;
        const nextGameId = rotationGameIds[currentRotationIndex];
        
        steamClient.stopFarm();
        
        setTimeout(() => {
          if (farmInterval) {
            steamClient.startFarm([nextGameId]);
            farmStartTime = Date.now();
            logToClient('success', `[Rotação] Farm alterado com sucesso para o jogo ID: ${nextGameId}`);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('steam:farm-tick', { farmHours: settings.getFarmHours() });
            }
          }
        }, 1500);
      }
    }, intervalMs);
  } else {
    steamClient.startFarm(gameIds);
  }

  farmStartTime = Date.now();
  farmInterval = setInterval(() => {
    if (steamClient.isFarming && farmStartTime) {
      const elapsed = (Date.now() - farmStartTime) / 3600000;
      steamClient.currentGames.forEach(id => settings.addFarmTime(id, elapsed));
      farmStartTime = Date.now();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('steam:farm-tick', { farmHours: settings.getFarmHours() });
    }
  }, 60000);
  updateTrayMenu();
}

function stopFarming() {
  if (farmStartTime && steamClient.currentGames.length > 0) {
    const elapsed = (Date.now() - farmStartTime) / 3600000;
    steamClient.currentGames.forEach(id => settings.addFarmTime(id, elapsed));
  }
  
  if (rotationIntervalTimer) {
    clearInterval(rotationIntervalTimer);
    rotationIntervalTimer = null;
  }
  rotationGameIds = [];
  currentRotationIndex = 0;

  steamClient.stopFarm();
  clearInterval(farmInterval);
  farmInterval = null;
  farmStartTime = null;
  updateTrayMenu();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('steam:farming-stopped');
    mainWindow.webContents.send('steam:farm-tick', { farmHours: settings.getFarmHours() });
  }
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
  ipcMain.handle('steam:start-farm', async (_e, gameIds) => { startFarming(gameIds); return { success: true }; });
  ipcMain.handle('steam:stop-farm', async () => { stopFarming(); return { success: true }; });
  ipcMain.handle('steam:logout', async () => { if (steamClient.isFarming) stopFarming(); steamClient.logout(); settings.clearRefreshToken(); updateTrayMenu(); return { success: true }; });
  ipcMain.handle('steam:get-status', async () => steamClient.getStatus());
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

  // --- Owned Games ---
  ipcMain.handle('steam:get-owned-games', async () => steamClient.getOwnedGames());

  // --- Auto Login ---
  ipcMain.handle('steam:auto-login', async () => {
    const token = settings.getRefreshToken();
    if (!token) return { success: false, reason: 'no-token' };
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

  // --- Weekly tracking ---
  ipcMain.handle('settings:get-weekly-hours', async () => settings.getWeeklyHours());

  // --- Game Rotation ---
  ipcMain.handle('settings:get-rotation-enabled', async () => settings.getRotationEnabled());
  ipcMain.handle('settings:set-rotation-enabled', async (_e, val) => { settings.setRotationEnabled(val); return { success: true }; });
  ipcMain.handle('settings:get-rotation-interval', async () => settings.getRotationInterval());
  ipcMain.handle('settings:set-rotation-interval', async (_e, val) => { settings.setRotationInterval(val); return { success: true }; });

  // --- Achievements ---
  ipcMain.handle('settings:get-unlocked-achievements', async () => settings.getUnlockedAchievements());
  ipcMain.handle('settings:unlock-achievement', async (_e, id) => {
    const newlyUnlocked = settings.unlockAchievement(id);
    if (newlyUnlocked && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:achievement-unlocked', { id });
    }
    return newlyUnlocked;
  });

  // --- Card Advisor ---
  ipcMain.handle('steam:get-card-recommendations', async () => {
    if (!steamClient.isLoggedIn || !webSessionCookies) {
      return { error: 'Not logged in or no web session' };
    }
    try {
      cardAdvisor.setCookies(webSessionCookies);
      cardAdvisor.setSteamId(steamClient.steamId);

      const ownedGames = await steamClient.getOwnedGames();

      const recommendations = await cardAdvisor.getRecommendations(ownedGames, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app:card-scan-progress', progress);
        }
      });

      return { success: true, recommendations };
    } catch (err) {
      console.error('Card Advisor error:', err);
      return { error: err.message };
    }
  });

  // --- Auto Update ---
  ipcMain.handle('app:check-for-updates', async () => checkForUpdates());
  ipcMain.handle('app:open-external', async (_e, url) => { shell.openExternal(url); return { success: true }; });

  // --- Window ---
  ipcMain.on('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.on('window:close', () => { if (mainWindow) mainWindow.hide(); });
}

function setupSteamEvents() {
  steamClient.on('disconnected', (data) => {
    if (farmInterval) { clearInterval(farmInterval); farmInterval = null; farmStartTime = null; }
    updateTrayMenu();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('steam:disconnected', data);
  });
  
  steamClient.on('logged-on', () => {
    if (settings.getAutoStartFarm()) {
      const g = settings.getGames();
      if (g.length > 0) startFarming(g.map(x => x.appId));
    }
  });

  // Capture web session cookies for Card Advisor
  steamClient.client.on('webSession', (sessionID, cookies) => {
    webSessionCookies = cookies;
    logToClient('info', 'Sessão web obtida com sucesso.');
  });

  steamClient.on('log', ({ level, message }) => logToClient(level, message));
}

app.whenReady().then(() => { 
  settings = new Settings(); 
  steamClient = new SteamClient();
  cardAdvisor = new CardAdvisor();
  app.setLoginItemSettings({ openAtLogin: settings.getRunOnStartup() });
  createWindow(); 
  createTray(); 
  setupIPC(); 
  setupSteamEvents(); 
});
app.on('window-all-closed', () => {});
app.on('before-quit', () => { app.isQuitting = true; if (steamClient?.isLoggedIn) { if (steamClient.isFarming) stopFarming(); steamClient.logout(); } });

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
