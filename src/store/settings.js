const Store = require('electron-store');
const { safeStorage } = require('electron');

class Settings {
  constructor() {
    this.store = new Store({ name: 'phantom-player-config' });
  }

  getGames() {
    return this.store.get('games', []);
  }

  setGames(games) {
    this.store.set('games', games);
  }

  getLanguage() {
    return this.store.get('language', 'pt');
  }

  setLanguage(lang) {
    this.store.set('language', lang);
  }

  saveCredentials(username, password) {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(password);
      this.store.set('credentials', {
        username,
        password: encrypted.toString('base64')
      });
    }
  }

  getCredentials() {
    const creds = this.store.get('credentials');
    if (creds && safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(
          Buffer.from(creds.password, 'base64')
        );
        return { username: creds.username, password: decrypted };
      } catch {
        return null;
      }
    }
    return null;
  }

  clearCredentials() {
    this.store.delete('credentials');
  }

  addFarmTime(appId, hours) {
    const data = this.store.get('farmHours', {});
    const key = String(appId);
    data[key] = (data[key] || 0) + hours;
    this.store.set('farmHours', data);
  }

  getFarmHours() {
    return this.store.get('farmHours', {});
  }

  getGameHours(appId) {
    const data = this.store.get('farmHours', {});
    return data[String(appId)] || 0;
  }
}

module.exports = Settings;
