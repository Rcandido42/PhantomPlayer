const Store = require('electron-store');
const { safeStorage } = require('electron');

class Settings {
  constructor() {
    this.store = new Store({ name: 'phantom-player-config' });
  }

  getGames() { return this.store.get('games', []); }
  setGames(games) { this.store.set('games', games); }

  getConfigPath() { return this.store.path; }

  getLanguage() { return this.store.get('language', 'pt'); }
  setLanguage(lang) { this.store.set('language', lang); }

  saveCredentials(username, password) {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(password);
      this.store.set('credentials', { username, password: encrypted.toString('base64') });
    }
  }

  getCredentials() {
    const creds = this.store.get('credentials');
    if (creds && safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(Buffer.from(creds.password, 'base64'));
        return { username: creds.username, password: decrypted };
      } catch { return null; }
    }
    return null;
  }

  clearCredentials() { this.store.delete('credentials'); }

  saveRefreshToken(token) {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      this.store.set('refreshToken', encrypted.toString('base64'));
    }
  }

  getRefreshToken() {
    const encrypted = this.store.get('refreshToken');
    if (encrypted && safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
      } catch { return null; }
    }
    return null;
  }

  clearRefreshToken() { this.store.delete('refreshToken'); }

  getTheme() { return this.store.get('theme', 'phantom'); }
  setTheme(theme) { this.store.set('theme', theme); }

  addFarmTime(appId, hours) {
    const data = this.store.get('farmHours', {});
    const key = String(appId);
    data[key] = (data[key] || 0) + hours;
    this.store.set('farmHours', data);
    this.addWeeklyHours(hours);
  }

  getFarmHours() { return this.store.get('farmHours', {}); }
  getGameHours(appId) { const data = this.store.get('farmHours', {}); return data[String(appId)] || 0; }

  getGoals() { return this.store.get('goals', {}); }
  setGoal(appId, hours) { const g = this.store.get('goals', {}); g[String(appId)] = hours; this.store.set('goals', g); }
  removeGoal(appId) { const g = this.store.get('goals', {}); delete g[String(appId)]; this.store.set('goals', g); }

  getRunOnStartup() { return this.store.get('runOnStartup', false); }
  setRunOnStartup(value) { this.store.set('runOnStartup', value); }

  getAutoStartFarm() { return this.store.get('autoStartFarm', false); }
  setAutoStartFarm(value) { this.store.set('autoStartFarm', value); }

  // --- Weekly tracking ---
  getWeeklyHours() {
    this._checkWeeklyReset();
    return this.store.get('weeklyHours', { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 });
  }

  addWeeklyHours(hours) {
    this._checkWeeklyReset();
    const day = String(new Date().getDay()); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    const data = this.store.get('weeklyHours', { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 });
    data[day] = (data[day] || 0) + hours;
    this.store.set('weeklyHours', data);
  }

  _checkWeeklyReset() {
    const lastReset = this.store.get('lastWeeklyReset');
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (!lastReset || new Date(lastReset) < startOfWeek) {
      this.store.set('weeklyHours', { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 });
      this.store.set('lastWeeklyReset', now.toISOString());
    }
  }

  // --- Game Rotation ---
  getRotationEnabled() { return this.store.get('rotationEnabled', false); }
  setRotationEnabled(value) { this.store.set('rotationEnabled', value); }

  getRotationInterval() { return this.store.get('rotationInterval', 15); }
  setRotationInterval(value) { this.store.set('rotationInterval', value); }

  // --- Farming safety and timers ---
  getMaxSimultaneousGames() { return this.store.get('maxSimultaneousGames', 5); }
  setMaxSimultaneousGames(value) {
    this.store.set('maxSimultaneousGames', Math.min(10, Math.max(1, Number(value) || 1)));
  }

  getPauseOnExternalGame() { return this.store.get('pauseOnExternalGame', true); }
  setPauseOnExternalGame(value) { this.store.set('pauseOnExternalGame', Boolean(value)); }

  getCardQueueRefreshMinutes() { return this.store.get('cardQueueRefreshMinutes', 15); }
  setCardQueueRefreshMinutes(value) {
    this.store.set('cardQueueRefreshMinutes', Math.min(180, Math.max(15, Number(value) || 15)));
  }

  getGameTimers() { return this.store.get('gameTimers', {}); }
  setGameTimer(appId, minutes) {
    const timers = this.getGameTimers();
    const key = String(appId);
    const normalized = Math.max(0, Number(minutes) || 0);
    if (normalized > 0) timers[key] = normalized;
    else delete timers[key];
    this.store.set('gameTimers', timers);
  }

  // --- Session history ---
  getSessions() { return this.store.get('sessions', []); }
  addSession(session) {
    const sessions = this.getSessions();
    sessions.unshift(session);
    this.store.set('sessions', sessions.slice(0, 250));
  }
  clearSessions() { this.store.delete('sessions'); }

  // --- Farm profiles ---
  getProfiles() { return this.store.get('profiles', []); }
  saveProfile(profile) {
    const profiles = this.getProfiles();
    const now = new Date().toISOString();
    const normalized = {
      id: profile.id || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: String(profile.name || 'Perfil').trim().slice(0, 60),
      gameIds: [...new Set((profile.gameIds || []).map(Number).filter(id => Number.isInteger(id) && id > 0))],
      rotationEnabled: Boolean(profile.rotationEnabled),
      rotationIntervalMinutes: Math.min(1440, Math.max(1, Number(profile.rotationIntervalMinutes) || 15)),
      durationMinutes: Math.min(10080, Math.max(0, Number(profile.durationMinutes) || 0)),
      createdAt: profile.createdAt || now,
      updatedAt: now
    };
    const index = profiles.findIndex(item => item.id === normalized.id);
    if (index >= 0) profiles[index] = normalized;
    else profiles.push(normalized);
    this.store.set('profiles', profiles.slice(0, 50));
    return normalized;
  }
  deleteProfile(id) {
    const profiles = this.getProfiles();
    const next = profiles.filter(profile => profile.id !== id);
    this.store.set('profiles', next);
    return next.length !== profiles.length;
  }

  // --- Portable, secret-free backups ---
  getExportData() {
    return {
      format: 'phantom-player-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        games: this.getGames(),
        farmHours: this.getFarmHours(),
        goals: this.getGoals(),
        weeklyHours: this.getWeeklyHours(),
        sessions: this.getSessions(),
        profiles: this.getProfiles(),
        gameTimers: this.getGameTimers(),
        blacklist: this.getBlacklist(),
        language: this.getLanguage(),
        theme: this.getTheme(),
        rotationEnabled: this.getRotationEnabled(),
        rotationInterval: this.getRotationInterval(),
        maxSimultaneousGames: this.getMaxSimultaneousGames(),
        pauseOnExternalGame: this.getPauseOnExternalGame(),
        cardQueueRefreshMinutes: this.getCardQueueRefreshMinutes(),
        runOnStartup: this.getRunOnStartup(),
        autoStartFarm: this.getAutoStartFarm()
      }
    };
  }

  importData(backup) {
    if (!backup || backup.format !== 'phantom-player-backup' || !backup.data) {
      throw new Error('Invalid PhantomPlayer backup');
    }
    const allowedKeys = [
      'games', 'farmHours', 'goals', 'weeklyHours', 'sessions', 'profiles', 'gameTimers',
      'blacklist', 'language', 'theme', 'rotationEnabled', 'rotationInterval',
      'maxSimultaneousGames', 'pauseOnExternalGame', 'cardQueueRefreshMinutes',
      'runOnStartup', 'autoStartFarm'
    ];
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(backup.data, key)) this.store.set(key, backup.data[key]);
    }
    return true;
  }

  clearAllData() { this.store.clear(); }

  getSecurityInfo() {
    return {
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
      credentialsSaved: Boolean(this.store.get('credentials')),
      refreshTokenSaved: Boolean(this.store.get('refreshToken')),
      configPath: this.getConfigPath(),
      exportIncludesSecrets: false
    };
  }

  // --- Achievements ---
  getUnlockedAchievements() { return this.store.get('unlockedAchievements', {}); }
  unlockAchievement(id) {
    const data = this.store.get('unlockedAchievements', {});
    if (!data[id]) {
      data[id] = { unlocked: true, date: new Date().toISOString() };
      this.store.set('unlockedAchievements', data);
      return true; 
    }
    return false; 
  }

  // --- Blacklist ---
  getBlacklist() { return this.store.get('blacklist', []); }
  
  addGameToBlacklist(appId) {
    const list = this.getBlacklist();
    if (!list.includes(appId)) {
      list.push(appId);
      this.store.set('blacklist', list);
      return true;
    }
    return false;
  }

  removeGameFromBlacklist(appId) {
    let list = this.getBlacklist();
    if (list.includes(appId)) {
      list = list.filter(id => id !== appId);
      this.store.set('blacklist', list);
      return true;
    }
    return false;
  }
}

module.exports = Settings;
