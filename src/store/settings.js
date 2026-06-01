const Store = require('electron-store');
const { safeStorage } = require('electron');

class Settings {
  constructor() {
    this.store = new Store({ name: 'phantom-player-config' });
  }

  getGames() { return this.store.get('games', []); }
  setGames(games) { this.store.set('games', games); }

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
