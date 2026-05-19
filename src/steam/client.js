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
    this._setupListeners();
  }

  _setupListeners() {
    this.client.on('steamGuard', (domain, callback) => {
      this.guardCallback = callback;
      this.emit('guard-required', { domain });
    });

    this.client.on('loggedOn', () => {
      this.isLoggedIn = true;
      this.steamId = this.client.steamID.getSteamID64();
      this.client.setPersona(SteamUser.EPersonaState.Online);
      this.emit('logged-on', { steamId: this.steamId });
    });

    this.client.on('error', (err) => {
      this.isLoggedIn = false;
      this.isFarming = false;
      this.emit('error', {
        eresult: err.eresult,
        message: err.message
      });
    });

    this.client.on('disconnected', (eresult, msg) => {
      this.isLoggedIn = false;
      this.isFarming = false;
      this.currentGames = [];
      this.emit('disconnected', { eresult, message: msg });
    });
  }

  login(username, password) {
    this.client.logOn({
      accountName: username,
      password: password
    });
  }

  submitGuardCode(code) {
    if (this.guardCallback) {
      this.guardCallback(code.trim());
      this.guardCallback = null;
    }
  }

  startFarm(gameIds) {
    if (this.isLoggedIn && gameIds.length > 0) {
      this.client.gamesPlayed(gameIds);
      this.isFarming = true;
      this.currentGames = gameIds;
      this.emit('farming-started', { games: gameIds });
    }
  }

  stopFarm() {
    this.client.gamesPlayed([]);
    this.isFarming = false;
    this.currentGames = [];
    this.emit('farming-stopped');
  }

  logout() {
    this.stopFarm();
    this.client.logOff();
    this.isLoggedIn = false;
    this.steamId = null;
  }

  getStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      isFarming: this.isFarming,
      currentGames: this.currentGames,
      steamId: this.steamId
    };
  }
}

module.exports = SteamClient;
