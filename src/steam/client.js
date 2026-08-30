const SteamUser = require('steam-user');
const EventEmitter = require('events');

class SteamClient extends EventEmitter {
  constructor() {
    super();
    this.client = new SteamUser();
    this.isLoggedIn = false;
    this.isFarming = false;
    this.currentGames = [];
    this.guardCallback = null;
    this.steamId = null;
    this.connectionState = 'offline';
    this.externalPlayingApp = 0;
    this._setupListeners();
  }

  _setupListeners() {
    this.client.on('steamGuard', (domain, callback) => {
      this.guardCallback = callback;
      this.emit('log', { level: 'warn', message: 'Steam Guard requerido!' });
      this.emit('guard-required', { domain });
    });

    this.client.on('loggedOn', () => {
      this.isLoggedIn = true;
      this.connectionState = 'online';
      this.steamId = this.client.steamID.getSteamID64();
      this.client.setPersona(SteamUser.EPersonaState.Online);
      this.emit('log', { level: 'success', message: `Autenticado com sucesso! ID: ${this.steamId}` });
      this.emit('logged-on', { steamId: this.steamId });
    });

    this.client.on('error', (err) => {
      this.isLoggedIn = false;
      this.isFarming = false;
      this.connectionState = 'offline';
      this.emit('log', { level: 'error', message: `Erro na Steam: ${err.message}` });
      this.emit('error', { eresult: err.eresult, message: err.message });
    });

    this.client.on('disconnected', (eresult, msg) => {
      this.isLoggedIn = false;
      this.isFarming = false;
      this.connectionState = 'offline';
      this.currentGames = [];
      this.emit('log', { level: 'warn', message: `Desconectado da Steam. Código: ${eresult}` });
      this.emit('disconnected', { eresult, message: msg });
    });

    this.client.on('playingState', (blocked, playingApp) => {
      this.externalPlayingApp = blocked ? Number(playingApp || 0) : 0;
      this.emit('external-playing', { blocked: Boolean(blocked), appId: this.externalPlayingApp });
    });
  }

  login(username, password) {
    this.connectionState = 'connecting';
    this.emit('log', { level: 'info', message: `Tentando login com senha para utilizador "${username}"...` });
    this.client.logOn({ accountName: username, password: password });
  }

  loginWithToken(refreshToken) {
    this.connectionState = 'connecting';
    this.emit('log', { level: 'info', message: `Tentando login automático com token persistente...` });
    this.client.logOn({ refreshToken });
  }

  submitGuardCode(code) {
    this.emit('log', { level: 'info', message: `Enviando código Steam Guard...` });
    if (this.guardCallback) {
      this.guardCallback(code.trim());
      this.guardCallback = null;
    }
  }

  startFarm(gameIds) {
    if (this.isLoggedIn && gameIds.length > 0) {
      const normalized = [...new Set(gameIds.map(Number))];
      if (this.isFarming && JSON.stringify(this.currentGames) === JSON.stringify(normalized)) return true;
      this.client.gamesPlayed(normalized);
      this.isFarming = true;
      this.currentGames = normalized;
      this.emit('log', { level: 'success', message: `Iniciando farm dos IDs: ${normalized.join(', ')}` });
      this.emit('farming-started', { games: normalized });
      return true;
    }
    return false;
  }

  stopFarm() {
    if (this.isLoggedIn) this.client.gamesPlayed([]);
    this.isFarming = false;
    this.currentGames = [];
    this.emit('log', { level: 'info', message: `Parando farm de jogos.` });
    this.emit('farming-stopped');
  }

  logout() {
    this.emit('log', { level: 'warn', message: `Efetuando logout da conta Steam.` });
    this.stopFarm();
    this.client.logOff();
    this.isLoggedIn = false;
    this.connectionState = 'offline';
    this.steamId = null;
  }

  getStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      isFarming: this.isFarming,
      currentGames: this.currentGames,
      steamId: this.steamId,
      connectionState: this.connectionState,
      externalPlayingApp: this.externalPlayingApp
    };
  }

  async getOwnedGames() {
    if (!this.isLoggedIn || !this.steamId) return [];
    try {
      const response = await this.client.getUserOwnedApps(this.steamId, {
        includeAppInfo: true,
        includePlayedFreeGames: true
      });
      if (response && response.apps) {
        return response.apps.map(app => ({
          appId: app.appid,
          name: app.name,
          playtime: app.playtime_forever
        })).sort((a, b) => a.name.localeCompare(b.name));
      }
      return [];
    } catch (err) {
      console.error('Error fetching owned games:', err);
      return [];
    }
  }
}

module.exports = SteamClient;
