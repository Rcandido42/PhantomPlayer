const test = require('node:test');
const assert = require('node:assert/strict');
const { FarmController, HOUR_MS, MINUTE_MS, uniqueAppIds } = require('../src/farm/controller');

class FakeSteamClient {
  constructor() {
    this.isLoggedIn = true;
    this.isFarming = false;
    this.currentGames = [];
    this.started = [];
  }

  startFarm(gameIds) {
    this.isFarming = true;
    this.currentGames = [...gameIds];
    this.started.push([...gameIds]);
    return true;
  }

  stopFarm() {
    this.isFarming = false;
    this.currentGames = [];
  }
}

class FakeSettings {
  constructor() {
    this.hours = {};
    this.sessions = [];
    this.blacklist = [];
    this.gameTimers = {};
    this.pauseOnExternal = true;
  }

  getBlacklist() { return this.blacklist; }
  getMaxSimultaneousGames() { return 2; }
  getRotationEnabled() { return false; }
  getRotationInterval() { return 15; }
  getGameTimers() { return this.gameTimers; }
  getPauseOnExternalGame() { return this.pauseOnExternal; }
  addFarmTime(appId, hours) { this.hours[String(appId)] = (this.hours[String(appId)] || 0) + hours; }
  addSession(session) { this.sessions.push(session); }
}

function createHarness() {
  let currentTime = Date.parse('2026-08-30T10:00:00Z');
  const steamClient = new FakeSteamClient();
  const settings = new FakeSettings();
  const controller = new FarmController({
    steamClient,
    settings,
    now: () => currentTime,
    autoTick: false
  });
  return {
    controller,
    steamClient,
    settings,
    advance(milliseconds) { currentTime += milliseconds; controller.tick(); }
  };
}

test('normalizes AppIDs and applies blacklist and simultaneous limit', () => {
  assert.deepEqual(uniqueAppIds([10, '10', 20, -1, 'bad', 30]), [10, 20, 30]);
  const harness = createHarness();
  harness.settings.blacklist = [20];
  const result = harness.controller.start([10, 20, 30, 40]);
  assert.equal(result.success, true);
  assert.deepEqual(harness.controller.gameIds, [10, 30, 40]);
  assert.deepEqual(harness.steamClient.currentGames, [10, 30]);
});

test('is idempotent and records elapsed hours and session history once', () => {
  const harness = createHarness();
  harness.controller.start([10, 20]);
  const secondStart = harness.controller.start([10, 20]);
  assert.equal(secondStart.alreadyRunning, true);
  assert.equal(harness.steamClient.started.length, 1);

  harness.advance(HOUR_MS);
  const result = harness.controller.stop('manual');
  assert.equal(harness.settings.hours['10'], 1);
  assert.equal(harness.settings.hours['20'], 1);
  assert.equal(harness.settings.sessions.length, 1);
  assert.equal(result.session.reason, 'manual');
});

test('does not count disconnected or externally paused time and resumes safely', () => {
  const harness = createHarness();
  harness.controller.start([10]);
  harness.advance(10 * MINUTE_MS);
  harness.controller.handleDisconnected();
  harness.advance(30 * MINUTE_MS);
  harness.steamClient.isLoggedIn = true;
  harness.controller.handleReconnected();
  harness.advance(10 * MINUTE_MS);
  harness.controller.setExternalGameRunning(true, 999);
  harness.advance(20 * MINUTE_MS);
  harness.controller.setExternalGameRunning(false, 0);
  harness.advance(10 * MINUTE_MS);
  harness.controller.stop();

  assert.ok(Math.abs(harness.settings.hours['10'] - 0.5) < 0.000001);
  assert.equal(harness.steamClient.started.length, 3);
});

test('stops automatically when a per-game timer is complete', () => {
  const harness = createHarness();
  harness.settings.gameTimers = { '10': 1 };
  harness.controller.start([10]);
  harness.advance(MINUTE_MS);
  assert.equal(harness.controller.running, false);
  assert.equal(harness.settings.sessions[0].reason, 'game-timers-complete');
  assert.ok(Math.abs(harness.settings.hours['10'] - (1 / 60)) < 0.000001);
});

test('rotates one game at a time on schedule', () => {
  const harness = createHarness();
  harness.controller.start([10, 20], { rotationEnabled: true, rotationIntervalMinutes: 1 });
  assert.deepEqual(harness.steamClient.currentGames, [10]);
  harness.advance(MINUTE_MS);
  assert.deepEqual(harness.steamClient.currentGames, [20]);
  harness.advance(MINUTE_MS);
  assert.deepEqual(harness.steamClient.currentGames, [10]);
});
