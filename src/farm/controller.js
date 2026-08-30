const EventEmitter = require('events');

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function uniqueAppIds(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value > 0))];
}

class FarmController extends EventEmitter {
  constructor({ steamClient, settings, now = () => Date.now(), tickMs = 1000, autoTick = true }) {
    super();
    this.steamClient = steamClient;
    this.settings = settings;
    this.now = now;
    this.tickMs = tickMs;
    this.autoTick = autoTick;
    this.interval = null;
    this.running = false;
    this.connectionState = steamClient.isLoggedIn ? 'online' : 'offline';
    this.pauseReason = null;
    this.session = null;
    this.gameIds = [];
    this.activeGameIds = [];
    this.rotationIndex = 0;
    this.nextRotationAt = null;
    this.lastTickAt = null;
    this.pendingMs = {};
    this.lastFlushAt = null;
  }

  start(gameIds, options = {}) {
    const blacklist = this.settings.getBlacklist();
    const maxSimultaneous = Math.max(1, Number(options.maxSimultaneous || this.settings.getMaxSimultaneousGames()) || 1);
    const sanitized = uniqueAppIds(gameIds).filter(id => !blacklist.includes(id));

    if (sanitized.length === 0) {
      return { success: false, error: 'no-eligible-games' };
    }

    const normalizedOptions = {
      rotationEnabled: options.rotationEnabled ?? this.settings.getRotationEnabled(),
      rotationIntervalMinutes: Math.max(1, Number(options.rotationIntervalMinutes || this.settings.getRotationInterval()) || 15),
      maxSimultaneous,
      durationMinutes: Math.max(0, Number(options.durationMinutes) || 0),
      stopAt: options.stopAt ? new Date(options.stopAt).getTime() : null,
      perGameMinutes: options.perGameMinutes || this.settings.getGameTimers(),
      profileId: options.profileId || null,
      source: options.source || 'manual'
    };

    if (normalizedOptions.stopAt && !Number.isFinite(normalizedOptions.stopAt)) {
      normalizedOptions.stopAt = null;
    }

    if (this.running) {
      const sameGames = JSON.stringify(this.gameIds) === JSON.stringify(sanitized);
      if (sameGames && this.session && this.session.source === normalizedOptions.source) {
        return { success: true, alreadyRunning: true, status: this.getStatus() };
      }
      this.stop('restarted');
    }

    const startedAt = this.now();
    const durationDeadline = normalizedOptions.durationMinutes > 0
      ? startedAt + normalizedOptions.durationMinutes * MINUTE_MS
      : null;

    this.running = true;
    this.gameIds = sanitized;
    this.rotationIndex = 0;
    this.pauseReason = null;
    this.pendingMs = {};
    this.lastTickAt = null;
    this.lastFlushAt = startedAt;
    this.session = {
      id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt,
      gameIds: [...sanitized],
      gameMs: {},
      options: normalizedOptions,
      source: normalizedOptions.source,
      profileId: normalizedOptions.profileId,
      endsAt: this._earliestDeadline(durationDeadline, normalizedOptions.stopAt)
    };

    this._resumeCurrentSelection();
    this._ensureInterval();
    this.emit('started', this.getStatus());
    this.emit('status', this.getStatus());
    return { success: true, status: this.getStatus() };
  }

  updateGames(gameIds) {
    if (!this.running) return { success: false, error: 'not-running' };
    const blacklist = this.settings.getBlacklist();
    const sanitized = uniqueAppIds(gameIds).filter(id => !blacklist.includes(id));
    if (sanitized.length === 0) {
      this.stop('queue-complete');
      return { success: true, completed: true };
    }

    this._flushElapsed();
    this.gameIds = sanitized;
    this.session.gameIds = [...new Set([...this.session.gameIds, ...sanitized])];
    if (this.rotationIndex >= sanitized.length) this.rotationIndex = 0;
    this._resumeCurrentSelection();
    this.emit('status', this.getStatus());
    return { success: true, status: this.getStatus() };
  }

  stop(reason = 'manual') {
    if (!this.running) return { success: true, alreadyStopped: true };
    this._flushElapsed();
    if (this.steamClient.isLoggedIn && this.steamClient.isFarming) {
      this.steamClient.stopFarm();
    }

    const endedAt = this.now();
    const completed = {
      id: this.session.id,
      startedAt: new Date(this.session.startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      elapsedMs: Object.values(this.session.gameMs).reduce((sum, value) => sum + value, 0),
      gameIds: this.session.gameIds,
      gameHours: Object.fromEntries(Object.entries(this.session.gameMs).map(([id, ms]) => [id, ms / HOUR_MS])),
      source: this.session.source,
      profileId: this.session.profileId,
      reason
    };
    this.settings.addSession(completed);

    this.running = false;
    this.gameIds = [];
    this.activeGameIds = [];
    this.pauseReason = null;
    this.session = null;
    this.pendingMs = {};
    this.lastTickAt = null;
    this.nextRotationAt = null;
    this._clearInterval();
    this.emit('stopped', { reason, session: completed });
    this.emit('status', this.getStatus());
    return { success: true, session: completed };
  }

  handleDisconnected() {
    this._flushElapsed();
    this.connectionState = 'reconnecting';
    this.activeGameIds = [];
    this.lastTickAt = null;
    this.emit('status', this.getStatus());
  }

  handleReconnected() {
    this.connectionState = 'online';
    if (this.running && !this.pauseReason) this._resumeCurrentSelection();
    this.emit('status', this.getStatus());
  }

  setExternalGameRunning(isRunning, appId = 0) {
    if (!this.settings.getPauseOnExternalGame()) return;
    if (isRunning) {
      this._flushElapsed();
      this.pauseReason = 'external-game';
      this.activeGameIds = [];
      if (this.steamClient.isLoggedIn && this.steamClient.isFarming) this.steamClient.stopFarm();
      this.emit('paused', { reason: this.pauseReason, appId });
    } else if (this.pauseReason === 'external-game') {
      this.pauseReason = null;
      if (this.running && this.connectionState === 'online') this._resumeCurrentSelection();
      this.emit('resumed', this.getStatus());
    }
    this.emit('status', this.getStatus());
  }

  tick() {
    if (!this.running || !this.session) return;
    const current = this.now();

    if (this.session.endsAt && current >= this.session.endsAt) {
      this.stop('timer-complete');
      return;
    }

    if (this.connectionState !== 'online' || this.pauseReason || this.activeGameIds.length === 0) {
      this.lastTickAt = null;
      this.emit('tick', this.getStatus());
      return;
    }

    if (this.lastTickAt === null) this.lastTickAt = current;
    const delta = Math.max(0, current - this.lastTickAt);
    this.lastTickAt = current;
    for (const appId of this.activeGameIds) {
      const key = String(appId);
      this.session.gameMs[key] = (this.session.gameMs[key] || 0) + delta;
      this.pendingMs[key] = (this.pendingMs[key] || 0) + delta;
    }

    const expiredGames = this.gameIds.filter(appId => {
      const limit = Number(this.session.options.perGameMinutes[String(appId)] || this.session.options.perGameMinutes[appId] || 0);
      return limit > 0 && (this.session.gameMs[String(appId)] || 0) >= limit * MINUTE_MS;
    });
    if (expiredGames.length > 0) {
      this.gameIds = this.gameIds.filter(id => !expiredGames.includes(id));
      this.emit('game-timer-complete', { gameIds: expiredGames });
      if (this.gameIds.length === 0) {
        this.stop('game-timers-complete');
        return;
      }
      if (this.rotationIndex >= this.gameIds.length) this.rotationIndex = 0;
      this._resumeCurrentSelection();
    } else if (this.session.options.rotationEnabled && this.nextRotationAt && current >= this.nextRotationAt) {
      this.rotationIndex = (this.rotationIndex + 1) % this.gameIds.length;
      this._resumeCurrentSelection();
      this.emit('rotated', this.getStatus());
    }

    if (current - this.lastFlushAt >= MINUTE_MS) this._flushPending();
    this.emit('tick', this.getStatus());
  }

  getStatus() {
    const now = this.now();
    const gameRemainingMs = {};
    if (this.session) {
      for (const appId of this.gameIds) {
        const limit = Number(this.session.options.perGameMinutes[String(appId)] || this.session.options.perGameMinutes[appId] || 0);
        if (limit > 0) gameRemainingMs[String(appId)] = Math.max(0, limit * MINUTE_MS - (this.session.gameMs[String(appId)] || 0));
      }
    }
    return {
      isFarming: this.running,
      currentGames: [...this.activeGameIds],
      queuedGames: [...this.gameIds],
      connectionState: this.connectionState,
      pauseReason: this.pauseReason,
      sessionStart: this.session ? new Date(this.session.startedAt).toISOString() : null,
      sessionElapsedMs: this.session ? Math.max(0, now - this.session.startedAt) : 0,
      activeElapsedMs: this.session ? Object.values(this.session.gameMs).reduce((sum, value) => sum + value, 0) : 0,
      endsAt: this.session?.endsAt ? new Date(this.session.endsAt).toISOString() : null,
      nextRotationAt: this.nextRotationAt ? new Date(this.nextRotationAt).toISOString() : null,
      gameRemainingMs,
      source: this.session?.source || null,
      profileId: this.session?.profileId || null
    };
  }

  _resumeCurrentSelection() {
    if (!this.running || this.connectionState !== 'online' || this.pauseReason || this.gameIds.length === 0) return;
    const { rotationEnabled, maxSimultaneous, rotationIntervalMinutes } = this.session.options;
    const selection = rotationEnabled
      ? [this.gameIds[this.rotationIndex % this.gameIds.length]]
      : this.gameIds.slice(0, maxSimultaneous);
    this.activeGameIds = selection;
    this.lastTickAt = this.now();
    this.nextRotationAt = rotationEnabled && this.gameIds.length > 1
      ? this.now() + rotationIntervalMinutes * MINUTE_MS
      : null;
    this.steamClient.startFarm(selection);
  }

  _flushElapsed() {
    if (this.running && this.lastTickAt !== null && this.connectionState === 'online' && !this.pauseReason) {
      const current = this.now();
      const delta = Math.max(0, current - this.lastTickAt);
      for (const appId of this.activeGameIds) {
        const key = String(appId);
        this.session.gameMs[key] = (this.session.gameMs[key] || 0) + delta;
        this.pendingMs[key] = (this.pendingMs[key] || 0) + delta;
      }
      this.lastTickAt = current;
    }
    this._flushPending();
  }

  _flushPending() {
    for (const [appId, milliseconds] of Object.entries(this.pendingMs)) {
      if (milliseconds > 0) this.settings.addFarmTime(Number(appId), milliseconds / HOUR_MS);
    }
    this.pendingMs = {};
    this.lastFlushAt = this.now();
  }

  _ensureInterval() {
    if (this.autoTick && !this.interval) this.interval = setInterval(() => this.tick(), this.tickMs);
  }

  _clearInterval() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  _earliestDeadline(...deadlines) {
    const valid = deadlines.filter(value => Number.isFinite(value) && value > this.now());
    return valid.length ? Math.min(...valid) : null;
  }
}

module.exports = { FarmController, uniqueAppIds, HOUR_MS, MINUTE_MS };
