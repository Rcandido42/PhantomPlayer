const i18n = {
  pt: {
    'login.subtitle': 'Faça login na sua conta Steam',
    'login.tabQR': 'QR Code',
    'login.tabClassic': 'Senha',
    'login.qrLoading': 'A gerar código QR...',
    'login.qrStep1': '1. Abre a app Steam no telemóvel',
    'login.qrStep2': '2. Vai a Steam Guard → Ler código QR',
    'login.qrStep3': '3. Aponta a câmara para este código',
    'login.qrConfirming': 'Confirma no telemóvel...',
    'login.qrExpired': 'Código expirado. A gerar novo...',
    'login.username': 'Nome de utilizador',
    'login.password': 'Senha',
    'login.remember': 'Lembrar credenciais',
    'login.submit': 'Entrar',
    'login.loading': 'A conectar...',
    'guard.title': 'Steam Guard',
    'guard.message': 'Insira o código de autenticação',
    'guard.emailMsg': 'Código enviado para o e-mail: ',
    'guard.appMsg': 'Insira o código da aplicação Steam Guard',
    'guard.submit': 'Confirmar',
    'dashboard.status.online': 'Online',
    'dashboard.status.farming': 'A farmar',
    'dashboard.logout': 'Sair',
    'dashboard.games.title': 'Jogos',
    'dashboard.games.searchPlaceholder': 'Pesquisar jogo ou digitar AppID...',
    'dashboard.games.add': 'Adicionar',
    'dashboard.games.noGames': 'Nenhum jogo adicionado',
    'dashboard.games.noGamesHint': 'Pesquise ou digite um AppID acima',
    'dashboard.games.hours': 'h farmadas',
    'dashboard.games.appId': 'AppID',
    'dashboard.farm.totalHours': 'Horas totais',
    'dashboard.farm.gameCount': 'Jogos',
    'dashboard.farm.sessionTime': 'Sessão atual',
    'dashboard.farm.start': 'Iniciar Farm',
    'dashboard.farm.stop': 'Parar Farm',
    'dashboard.games.loadLibrary': 'Meus Jogos',
    'settings.title': 'Configurações',
    'settings.runStartup': 'Iniciar com o Windows',
    'settings.autoFarm': 'Iniciar Farm automaticamente após login',
    'settings.close': 'Salvar e Fechar',
    'library.title': 'Meus Jogos da Steam',
    'library.search': 'Pesquisar jogo...',
    'goals.title': 'Definir Meta',
    'goals.label': 'Horas objetivo',
    'goals.save': 'Guardar',
    'goals.remove': 'Remover',
    'goals.progress': 'de',
    'goals.complete': 'Meta atingida!',
    'autoLogin.reconnecting': 'A reconectar...',
    'update.available': 'Nova versão disponível:',
    'error.invalidPassword': 'Senha incorreta. Verifique as credenciais.',
    'error.rateLimit': 'Muitas tentativas. Aguarde alguns minutos.',
    'error.generic': 'Erro ao conectar. Tente novamente.',
    'error.disconnected': 'Desconectado da Steam.'
  },
  en: {
    'login.subtitle': 'Log in to your Steam account',
    'login.tabQR': 'QR Code',
    'login.tabClassic': 'Password',
    'login.qrLoading': 'Generating QR code...',
    'login.qrStep1': '1. Open the Steam app on your phone',
    'login.qrStep2': '2. Go to Steam Guard → Scan QR code',
    'login.qrStep3': '3. Point the camera at this code',
    'login.qrConfirming': 'Confirm on your phone...',
    'login.qrExpired': 'Code expired. Generating new...',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.remember': 'Remember credentials',
    'login.submit': 'Log In',
    'login.loading': 'Connecting...',
    'guard.title': 'Steam Guard',
    'guard.message': 'Enter the authentication code',
    'guard.emailMsg': 'Code sent to email: ',
    'guard.appMsg': 'Enter your Steam Guard mobile code',
    'guard.submit': 'Confirm',
    'dashboard.status.online': 'Online',
    'dashboard.status.farming': 'Farming',
    'dashboard.logout': 'Logout',
    'dashboard.games.title': 'Games',
    'dashboard.games.searchPlaceholder': 'Search game or type AppID...',
    'dashboard.games.add': 'Add',
    'dashboard.games.noGames': 'No games added',
    'dashboard.games.noGamesHint': 'Search or type an AppID above',
    'dashboard.games.hours': 'h farmed',
    'dashboard.games.appId': 'AppID',
    'dashboard.farm.totalHours': 'Total hours',
    'dashboard.farm.gameCount': 'Games',
    'dashboard.farm.sessionTime': 'Current session',
    'dashboard.farm.start': 'Start Farming',
    'dashboard.farm.stop': 'Stop Farming',
    'dashboard.games.loadLibrary': 'My Games',
    'settings.title': 'Settings',
    'settings.runStartup': 'Run on Windows Startup',
    'settings.autoFarm': 'Start farming automatically after login',
    'settings.close': 'Save and Close',
    'library.title': 'My Steam Games',
    'library.search': 'Search game...',
    'goals.title': 'Set Goal',
    'goals.label': 'Target hours',
    'goals.save': 'Save',
    'goals.remove': 'Remove',
    'goals.progress': 'of',
    'goals.complete': 'Goal reached!',
    'autoLogin.reconnecting': 'Reconnecting...',
    'update.available': 'New version available:',
    'error.invalidPassword': 'Wrong password. Check your credentials.',
    'error.rateLimit': 'Too many attempts. Wait a few minutes.',
    'error.generic': 'Connection error. Try again.',
    'error.disconnected': 'Disconnected from Steam.'
  }
};

let currentLang = 'pt';
function t(key) { return (i18n[currentLang] && i18n[currentLang][key]) || key; }

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.getElementById('btn-lang').textContent = currentLang.toUpperCase();
}

const $ = (id) => document.getElementById(id);
const dom = {
  screenLogin: $('screen-login'), screenDashboard: $('screen-dashboard'),
  formLogin: $('form-login'), inputUsername: $('input-username'), inputPassword: $('input-password'),
  checkRemember: $('check-remember'), btnLogin: $('btn-login'), loginSpinner: $('login-spinner'), loginError: $('login-error'),
  modalGuard: $('modal-guard'), guardMessage: $('guard-message'), inputGuard: $('input-guard'), btnGuardSubmit: $('btn-guard-submit'),
  tabQR: $('tab-qr'), tabClassic: $('tab-classic'), panelQR: $('panel-qr'), panelClassic: $('panel-classic'),
  qrWrapper: $('qr-wrapper'), qrImage: $('qr-image'), qrLoading: $('qr-loading'), qrStatus: $('qr-status'),
  statusDot: $('status-dot'), statusText: $('status-text'), steamId: $('steam-id'), btnLogout: $('btn-logout'),
  inputSearch: $('input-search'), btnAddGame: $('btn-add-game'), searchResults: $('search-results'),
  gameList: $('game-list'), emptyGames: $('empty-games'),
  totalHours: $('total-hours'), gameCount: $('game-count'), sessionTime: $('session-time'),
  btnFarm: $('btn-farm'), btnFarmText: $('btn-farm-text'), farmIconPlay: $('farm-icon-play'), farmIconStop: $('farm-icon-stop'),
  btnLang: $('btn-lang'), btnMinimize: $('btn-minimize'), btnClose: $('btn-close'),
  btnTheme: $('btn-theme'), themeDropdown: $('theme-dropdown'),
  btnSettings: $('btn-settings'), modalSettings: $('modal-settings'), btnSettingsClose: $('btn-settings-close'),
  checkRunStartup: $('check-run-startup'), checkAutoFarm: $('check-auto-farm'),
  btnLoadLibrary: $('btn-load-library'), modalLibrary: $('modal-library'), btnLibraryClose: $('btn-library-close'),
  inputLibrarySearch: $('input-library-search'), libraryList: $('library-list'), libraryLoading: $('library-loading'),
  modalGoal: $('modal-goal'), goalGameName: $('goal-game-name'), inputGoalHours: $('input-goal-hours'),
  btnGoalSave: $('btn-goal-save'), btnGoalRemove: $('btn-goal-remove'),
  statsChart: $('stats-chart'),
  updateBanner: $('update-banner'), updateText: $('update-text'), btnUpdate: $('btn-update')
};

let state = { games: [], farmHours: {}, goals: {}, isFarming: false, sessionStart: null, sessionInterval: null, searchDebounce: null, libraryGames: [], goalEditAppId: null, updateUrl: null };

function getGameImage(appId) {
  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg`;
}

// ========== SCREENS ==========
function showScreen(screenName) {
  dom.screenLogin.classList.remove('active'); dom.screenLogin.classList.add('hidden');
  dom.screenDashboard.classList.remove('active'); dom.screenDashboard.classList.add('hidden');
  if (screenName === 'login') { dom.screenLogin.classList.remove('hidden'); dom.screenLogin.classList.add('active'); }
  else if (screenName === 'dashboard') { dom.screenDashboard.classList.remove('hidden'); dom.screenDashboard.classList.add('active'); updateDashboard(); }
}

// ========== LOGIN TABS ==========
dom.tabQR.addEventListener('click', () => switchLoginTab('qr'));
dom.tabClassic.addEventListener('click', () => switchLoginTab('classic'));

function switchLoginTab(tab) {
  dom.tabQR.classList.toggle('active', tab === 'qr');
  dom.tabClassic.classList.toggle('active', tab === 'classic');
  dom.panelQR.classList.toggle('active', tab === 'qr');
  dom.panelClassic.classList.toggle('active', tab === 'classic');
  hideError();
  if (tab === 'qr') startQRLogin();
  else window.phantom.cancelQR();
}

// ========== QR CODE LOGIN ==========
async function startQRLogin() {
  dom.qrImage.classList.add('hidden');
  dom.qrLoading.classList.remove('hidden');
  dom.qrStatus.classList.add('hidden');

  const result = await window.phantom.startQR();
  if (result.success) {
    dom.qrImage.src = result.qrImage;
    dom.qrImage.classList.remove('hidden');
    dom.qrLoading.classList.add('hidden');
  } else {
    showError(result.error || t('error.generic'));
  }
}

window.phantom.onQRScanned(() => {
  dom.qrStatus.classList.remove('hidden');
});

window.phantom.onQRAuthenticated((data) => {
  showScreen('dashboard');
});

window.phantom.onQRTimeout(() => {
  startQRLogin();
});

window.phantom.onQRError((data) => {
  showError(data.message || t('error.generic'));
});

// ========== CLASSIC LOGIN ==========
dom.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = dom.inputUsername.value.trim();
  const password = dom.inputPassword.value;
  const remember = dom.checkRemember.checked;
  if (!username || !password) return;
  setLoginLoading(true); hideError();
  try {
    const result = await window.phantom.login(username, password, remember);
    if (result.success) { setLoginLoading(false); showScreen('dashboard'); }
    else if (result.guard) { }
    else if (result.error) { setLoginLoading(false); showError(getErrorMessage(result)); }
  } catch { setLoginLoading(false); showError(t('error.generic')); }
});

function setLoginLoading(loading) {
  dom.btnLogin.disabled = loading;
  const label = dom.btnLogin.querySelector('[data-i18n]');
  if (loading) { label.textContent = t('login.loading'); dom.loginSpinner.classList.remove('hidden'); }
  else { label.textContent = t('login.submit'); dom.loginSpinner.classList.add('hidden'); }
}

function showError(msg) { dom.loginError.textContent = msg; dom.loginError.classList.remove('hidden'); }
function hideError() { dom.loginError.classList.add('hidden'); }
function getErrorMessage(result) {
  if (result.eresult === 5) return t('error.invalidPassword');
  if (result.eresult === 84) return t('error.rateLimit');
  return result.error || t('error.generic');
}

// ========== STEAM GUARD ==========
window.phantom.onGuardRequired((data) => {
  dom.modalGuard.classList.remove('hidden');
  dom.inputGuard.value = '';
  setTimeout(() => dom.inputGuard.focus(), 100);
  dom.guardMessage.textContent = data.domain ? t('guard.emailMsg') + data.domain : t('guard.appMsg');
});

dom.btnGuardSubmit.addEventListener('click', async () => {
  const code = dom.inputGuard.value.trim();
  if (!code) return;
  dom.modalGuard.classList.add('hidden');
  try {
    const result = await window.phantom.submitGuardCode(code);
    setLoginLoading(false);
    if (result && result.success) showScreen('dashboard');
    else if (result && result.error) showError(getErrorMessage(result));
  } catch { setLoginLoading(false); showError(t('error.generic')); }
});

dom.inputGuard.addEventListener('keydown', (e) => { if (e.key === 'Enter') dom.btnGuardSubmit.click(); });

// ========== DASHBOARD ==========
async function updateDashboard() {
  const status = await window.phantom.getStatus();
  state.farmHours = await window.phantom.getFarmHours();
  dom.steamId.textContent = status.steamId || '';
  updateStats(); updateFarmButton();
}

function updateStats() {
  const total = Object.values(state.farmHours).reduce((sum, h) => sum + h, 0);
  dom.totalHours.textContent = total.toFixed(1);
  dom.gameCount.textContent = state.games.length;
}

function updateFarmButton() {
  dom.btnFarm.disabled = state.games.length === 0;
  if (state.isFarming) {
    dom.btnFarmText.textContent = t('dashboard.farm.stop');
    dom.farmIconPlay.classList.add('hidden'); dom.farmIconStop.classList.remove('hidden');
    dom.btnFarm.classList.add('farming'); dom.statusDot.classList.add('farming');
    dom.statusText.textContent = t('dashboard.status.farming');
  } else {
    dom.btnFarmText.textContent = t('dashboard.farm.start');
    dom.farmIconPlay.classList.remove('hidden'); dom.farmIconStop.classList.add('hidden');
    dom.btnFarm.classList.remove('farming'); dom.statusDot.classList.remove('farming');
    dom.statusText.textContent = t('dashboard.status.online');
  }
}

// ========== FARM ==========
dom.btnFarm.addEventListener('click', async () => {
  if (state.isFarming) { await window.phantom.stopFarm(); state.isFarming = false; stopSessionTimer(); }
  else { const ids = state.games.map(g => g.appId); if (!ids.length) return; await window.phantom.startFarm(ids); state.isFarming = true; startSessionTimer(); }
  updateFarmButton();
});

function startSessionTimer() {
  state.sessionStart = Date.now(); dom.sessionTime.textContent = '00:00:00';
  state.sessionInterval = setInterval(() => {
    const s = Math.floor((Date.now() - state.sessionStart) / 1000);
    dom.sessionTime.textContent = `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }, 1000);
}

function stopSessionTimer() { clearInterval(state.sessionInterval); state.sessionInterval = null; state.sessionStart = null; dom.sessionTime.textContent = '00:00:00'; }

window.phantom.onFarmTick((data) => { state.farmHours = data.farmHours; updateStats(); renderGameList(); renderStatsChart(); });
window.phantom.onFarmingStopped(() => { state.isFarming = false; stopSessionTimer(); updateFarmButton(); });

// ========== GAMES ==========
async function loadGames() {
  state.games = await window.phantom.getGames();
  state.farmHours = await window.phantom.getFarmHours();
  state.goals = await window.phantom.getGoals();
  renderGameList(); updateStats(); updateFarmButton(); renderStatsChart();
}

function renderGameList() {
  dom.gameList.querySelectorAll('.game-item').forEach(item => item.remove());
  if (state.games.length === 0) { dom.emptyGames.classList.remove('hidden'); return; }
  dom.emptyGames.classList.add('hidden');

  state.games.forEach(game => {
    const hours = (state.farmHours[String(game.appId)] || 0).toFixed(1);
    const goal = state.goals[String(game.appId)];
    const imgUrl = getGameImage(game.appId);
    const el = document.createElement('div');
    el.className = 'game-item';
    let progressHtml = '';
    if (goal) {
      const pct = Math.min((parseFloat(hours) / goal) * 100, 100);
      const isComplete = pct >= 100;
      progressHtml = `
        <div class="game-item-progress"><div class="game-item-progress-fill${isComplete ? ' complete' : ''}" style="width:${pct}%"></div></div>
        <div class="game-item-goal${isComplete ? ' complete' : ''}">${isComplete ? '✓ ' + t('goals.complete') : hours + ' ' + t('goals.progress') + ' ' + goal + 'h'}</div>`;
    }
    el.innerHTML = `
      <img class="game-item-icon" src="${imgUrl}" alt="" onerror="this.style.display='none'">
      <div class="game-item-info">
        <div class="game-item-name">${escapeHtml(game.name || 'App ' + game.appId)}</div>
        <div class="game-item-meta">
          <span>${t('dashboard.games.appId')}: ${game.appId}</span>
          <span>${hours}${t('dashboard.games.hours')}</span>
        </div>
        ${progressHtml}
      </div>
      <button class="game-item-remove" data-appid="${game.appId}" title="Remover">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    el.addEventListener('click', (e) => { if (!e.target.closest('.game-item-remove')) openGoalModal(game); });
    dom.gameList.appendChild(el);
  });

  dom.gameList.querySelectorAll('.game-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); removeGame(Number(btn.dataset.appid)); });
  });
}

async function addGame(game) {
  if (state.games.some(g => g.appId === game.appId)) return;
  game.icon = getGameImage(game.appId);
  state.games.push(game);
  await window.phantom.saveGames(state.games);
  renderGameList(); updateStats(); updateFarmButton();
}

async function removeGame(appId) {
  state.games = state.games.filter(g => g.appId !== appId);
  await window.phantom.saveGames(state.games);
  renderGameList(); updateStats(); updateFarmButton();
}

dom.btnAddGame.addEventListener('click', () => {
  const appId = parseInt(dom.inputSearch.value.trim(), 10);
  if (!isNaN(appId) && appId > 0) { addGame({ appId, name: `App ${appId}`, icon: '' }); dom.inputSearch.value = ''; dom.searchResults.classList.add('hidden'); }
});

dom.inputSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); dom.btnAddGame.click(); } });

// ========== SEARCH ==========
dom.inputSearch.addEventListener('input', () => {
  const query = dom.inputSearch.value.trim();
  clearTimeout(state.searchDebounce);
  if (!query || /^\d+$/.test(query)) { dom.searchResults.classList.add('hidden'); return; }
  state.searchDebounce = setTimeout(async () => {
    const results = await window.phantom.searchGames(query);
    renderSearchResults(results);
  }, 400);
});

document.addEventListener('click', (e) => {
  if (!dom.searchResults.contains(e.target) && e.target !== dom.inputSearch) dom.searchResults.classList.add('hidden');
});

function renderSearchResults(results) {
  dom.searchResults.innerHTML = '';
  if (results.length === 0) { dom.searchResults.classList.add('hidden'); return; }
  results.slice(0, 8).forEach(item => {
    const imgUrl = getGameImage(item.appId);
    const el = document.createElement('div');
    el.className = 'search-item';
    el.innerHTML = `<img src="${imgUrl}" alt="" onerror="this.style.display='none'"><div class="search-item-info"><div class="search-item-name">${escapeHtml(item.name)}</div><div class="search-item-id">AppID: ${item.appId}</div></div>`;
    el.addEventListener('click', () => { addGame({ appId: item.appId, name: item.name, icon: imgUrl }); dom.inputSearch.value = ''; dom.searchResults.classList.add('hidden'); });
    dom.searchResults.appendChild(el);
  });
  dom.searchResults.classList.remove('hidden');
}

// ========== LOGOUT ==========
dom.btnLogout.addEventListener('click', async () => {
  if (state.isFarming) { await window.phantom.stopFarm(); stopSessionTimer(); state.isFarming = false; }
  await window.phantom.logout();
  state.games = []; state.farmHours = {};
  showScreen('login'); dom.inputPassword.value = '';
});

window.phantom.onDisconnected(() => { state.isFarming = false; stopSessionTimer(); showScreen('login'); showError(t('error.disconnected')); });

// ========== WINDOW ==========
dom.btnMinimize.addEventListener('click', () => window.phantom.minimizeWindow());
dom.btnClose.addEventListener('click', () => window.phantom.closeWindow());
// ========== LANGUAGE ==========
dom.btnLang.addEventListener('click', async () => {
  currentLang = currentLang === 'pt' ? 'en' : 'pt';
  await window.phantom.setLanguage(currentLang);
  applyTranslations(); renderGameList(); updateFarmButton();
});

// ========== THEME ==========
let currentTheme = 'phantom';

dom.btnTheme.addEventListener('click', (e) => {
  e.stopPropagation();
  dom.themeDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!dom.themeDropdown.contains(e.target) && e.target !== dom.btnTheme) {
    dom.themeDropdown.classList.add('hidden');
  }
});

dom.themeDropdown.querySelectorAll('.theme-option').forEach(btn => {
  btn.addEventListener('click', async () => {
    const theme = btn.dataset.theme;
    applyTheme(theme);
    await window.phantom.setTheme(theme);
    dom.themeDropdown.classList.add('hidden');
  });
});

function applyTheme(theme) {
  currentTheme = theme;
  if (theme === 'phantom') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  dom.themeDropdown.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// ========== SETTINGS ==========
dom.btnSettings.addEventListener('click', async () => {
  dom.checkRunStartup.checked = await window.phantom.getRunOnStartup();
  dom.checkAutoFarm.checked = await window.phantom.getAutoStartFarm();
  dom.modalSettings.classList.remove('hidden');
});

dom.btnSettingsClose.addEventListener('click', async () => {
  await window.phantom.setRunOnStartup(dom.checkRunStartup.checked);
  await window.phantom.setAutoStartFarm(dom.checkAutoFarm.checked);
  dom.modalSettings.classList.add('hidden');
});

// ========== LIBRARY ==========
dom.btnLoadLibrary.addEventListener('click', async () => {
  dom.modalLibrary.classList.remove('hidden');
  dom.libraryList.innerHTML = '';
  dom.libraryLoading.classList.remove('hidden');
  dom.inputLibrarySearch.value = '';
  
  state.libraryGames = await window.phantom.getOwnedGames();
  dom.libraryLoading.classList.add('hidden');
  renderLibraryList(state.libraryGames);
});

dom.btnLibraryClose.addEventListener('click', () => {
  dom.modalLibrary.classList.add('hidden');
});

dom.inputLibrarySearch.addEventListener('input', () => {
  const query = dom.inputLibrarySearch.value.trim().toLowerCase();
  if (!query) renderLibraryList(state.libraryGames);
  else renderLibraryList(state.libraryGames.filter(g => g.name.toLowerCase().includes(query)));
});

function renderLibraryList(games) {
  dom.libraryList.innerHTML = '';
  games.forEach(game => {
    const imgUrl = getGameImage(game.appId);
    const el = document.createElement('div');
    el.className = 'library-item';
    el.innerHTML = `<img class="library-item-icon" src="${imgUrl}" alt="" onerror="this.style.display='none'"><div class="library-item-name">${escapeHtml(game.name)}</div>`;
    el.addEventListener('click', () => { addGame({ appId: game.appId, name: game.name, icon: imgUrl }); });
    dom.libraryList.appendChild(el);
  });
}

// ========== STATS CHART ==========
function renderStatsChart() {
  dom.statsChart.innerHTML = '';
  const entries = state.games
    .map(g => ({ name: g.name || 'App ' + g.appId, hours: state.farmHours[String(g.appId)] || 0 }))
    .filter(e => e.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 6);
  if (entries.length === 0) return;
  const maxHours = Math.max(...entries.map(e => e.hours));
  entries.forEach(e => {
    const pct = (e.hours / maxHours) * 100;
    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.innerHTML = `<span class="chart-bar-name" title="${escapeHtml(e.name)}">${escapeHtml(e.name)}</span><div class="chart-bar-track"><div class="chart-bar-fill" style="width:0%"></div></div><span class="chart-bar-value">${e.hours.toFixed(1)}h</span>`;
    dom.statsChart.appendChild(row);
    requestAnimationFrame(() => { row.querySelector('.chart-bar-fill').style.width = pct + '%'; });
  });
}

// ========== GOALS ==========
let goalEditAppId = null;

function openGoalModal(game) {
  goalEditAppId = game.appId;
  dom.goalGameName.textContent = game.name || 'App ' + game.appId;
  const existing = state.goals[String(game.appId)];
  dom.inputGoalHours.value = existing || '';
  dom.btnGoalRemove.style.display = existing ? '' : 'none';
  dom.modalGoal.classList.remove('hidden');
  setTimeout(() => dom.inputGoalHours.focus(), 100);
}

dom.btnGoalSave.addEventListener('click', async () => {
  const hours = parseInt(dom.inputGoalHours.value, 10);
  if (!hours || hours <= 0 || !goalEditAppId) return;
  await window.phantom.setGoal(goalEditAppId, hours);
  state.goals[String(goalEditAppId)] = hours;
  dom.modalGoal.classList.add('hidden');
  renderGameList();
});

dom.btnGoalRemove.addEventListener('click', async () => {
  if (!goalEditAppId) return;
  await window.phantom.removeGoal(goalEditAppId);
  delete state.goals[String(goalEditAppId)];
  dom.modalGoal.classList.add('hidden');
  renderGameList();
});

dom.inputGoalHours.addEventListener('keydown', (e) => { if (e.key === 'Enter') dom.btnGoalSave.click(); });

// ========== INIT ==========
(async function init() {
  currentLang = await window.phantom.getLanguage() || 'pt';
  applyTranslations();
  const savedTheme = await window.phantom.getTheme() || 'phantom';
  applyTheme(savedTheme);

  const overlay = document.createElement('div');
  overlay.className = 'auto-login-overlay';
  overlay.id = 'auto-login-overlay';
  overlay.innerHTML = `<img src="../assets/icon.png" alt=""><div class="auto-login-spinner"></div><span class="auto-login-text">${t('autoLogin.reconnecting')}</span>`;
  document.body.appendChild(overlay);

  const autoResult = await window.phantom.autoLogin();

  if (autoResult.success) {
    overlay.remove();
    await loadGames();
    showScreen('dashboard');
    checkUpdates();
    return;
  }

  overlay.remove();
  const creds = await window.phantom.getCredentials();
  if (creds) { dom.inputUsername.value = creds.username; dom.inputPassword.value = creds.password; dom.checkRemember.checked = true; }
  await loadGames();
  startQRLogin();
  checkUpdates();
})();

async function checkUpdates() {
  try {
    const result = await window.phantom.checkForUpdates();
    if (result.updateAvailable) {
      state.updateUrl = result.downloadUrl;
      dom.updateText.textContent = t('update.available') + ' v' + result.latestVersion;
      dom.updateBanner.classList.remove('hidden');
    }
  } catch {}
}

dom.btnUpdate.addEventListener('click', () => {
  if (state.updateUrl) window.phantom.openExternal(state.updateUrl);
});
