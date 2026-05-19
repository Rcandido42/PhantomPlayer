const i18n = {
  pt: {
    'login.subtitle': 'Faça login na sua conta Steam',
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
    'error.invalidPassword': 'Senha incorreta. Verifique as credenciais.',
    'error.rateLimit': 'Muitas tentativas. Aguarde alguns minutos.',
    'error.generic': 'Erro ao conectar. Tente novamente.',
    'error.disconnected': 'Desconectado da Steam.'
  },
  en: {
    'login.subtitle': 'Log in to your Steam account',
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
    'error.invalidPassword': 'Wrong password. Check your credentials.',
    'error.rateLimit': 'Too many attempts. Wait a few minutes.',
    'error.generic': 'Connection error. Try again.',
    'error.disconnected': 'Disconnected from Steam.'
  }
};

let currentLang = 'pt';

function t(key) {
  return (i18n[currentLang] && i18n[currentLang][key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.getElementById('btn-lang').textContent = currentLang.toUpperCase();
}

const $ = (id) => document.getElementById(id);

const dom = {
  screenLogin: $('screen-login'),
  screenDashboard: $('screen-dashboard'),
  formLogin: $('form-login'),
  inputUsername: $('input-username'),
  inputPassword: $('input-password'),
  checkRemember: $('check-remember'),
  btnLogin: $('btn-login'),
  loginSpinner: $('login-spinner'),
  loginError: $('login-error'),
  modalGuard: $('modal-guard'),
  guardMessage: $('guard-message'),
  inputGuard: $('input-guard'),
  btnGuardSubmit: $('btn-guard-submit'),
  statusDot: $('status-dot'),
  statusText: $('status-text'),
  steamId: $('steam-id'),
  btnLogout: $('btn-logout'),
  inputSearch: $('input-search'),
  btnAddGame: $('btn-add-game'),
  searchResults: $('search-results'),
  gameList: $('game-list'),
  emptyGames: $('empty-games'),
  totalHours: $('total-hours'),
  gameCount: $('game-count'),
  sessionTime: $('session-time'),
  btnFarm: $('btn-farm'),
  btnFarmText: $('btn-farm-text'),
  farmIconPlay: $('farm-icon-play'),
  farmIconStop: $('farm-icon-stop'),
  btnLang: $('btn-lang'),
  btnMinimize: $('btn-minimize'),
  btnClose: $('btn-close')
};

let state = {
  games: [],
  farmHours: {},
  isFarming: false,
  sessionStart: null,
  sessionInterval: null,
  searchDebounce: null
};

function showScreen(screenName) {
  dom.screenLogin.classList.remove('active');
  dom.screenLogin.classList.add('hidden');
  dom.screenDashboard.classList.remove('active');
  dom.screenDashboard.classList.add('hidden');

  if (screenName === 'login') {
    dom.screenLogin.classList.remove('hidden');
    dom.screenLogin.classList.add('active');
  } else if (screenName === 'dashboard') {
    dom.screenDashboard.classList.remove('hidden');
    dom.screenDashboard.classList.add('active');
    updateDashboard();
  }
}

dom.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = dom.inputUsername.value.trim();
  const password = dom.inputPassword.value;
  const remember = dom.checkRemember.checked;
  if (!username || !password) return;

  setLoginLoading(true);
  hideError();

  try {
    const result = await window.phantom.login(username, password, remember);
    if (result.success) {
      setLoginLoading(false);
      showScreen('dashboard');
    } else if (result.guard) {
    } else if (result.error) {
      setLoginLoading(false);
      showError(getErrorMessage(result));
    }
  } catch (err) {
    setLoginLoading(false);
    showError(t('error.generic'));
  }
});

function setLoginLoading(loading) {
  dom.btnLogin.disabled = loading;
  const label = dom.btnLogin.querySelector('[data-i18n]');
  if (loading) {
    label.textContent = t('login.loading');
    dom.loginSpinner.classList.remove('hidden');
  } else {
    label.textContent = t('login.submit');
    dom.loginSpinner.classList.add('hidden');
  }
}

function showError(msg) {
  dom.loginError.textContent = msg;
  dom.loginError.classList.remove('hidden');
}

function hideError() {
  dom.loginError.classList.add('hidden');
}

function getErrorMessage(result) {
  if (result.eresult === 5) return t('error.invalidPassword');
  if (result.eresult === 84) return t('error.rateLimit');
  return result.error || t('error.generic');
}

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
    if (result && result.success) {
      showScreen('dashboard');
    } else if (result && result.error) {
      showError(getErrorMessage(result));
    }
  } catch (err) {
    setLoginLoading(false);
    showError(t('error.generic'));
  }
});

dom.inputGuard.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.btnGuardSubmit.click();
});

async function updateDashboard() {
  const status = await window.phantom.getStatus();
  state.farmHours = await window.phantom.getFarmHours();
  dom.steamId.textContent = status.steamId || '';
  updateStats();
  updateFarmButton();
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
    dom.farmIconPlay.classList.add('hidden');
    dom.farmIconStop.classList.remove('hidden');
    dom.btnFarm.classList.add('farming');
    dom.statusDot.classList.add('farming');
    dom.statusText.textContent = t('dashboard.status.farming');
  } else {
    dom.btnFarmText.textContent = t('dashboard.farm.start');
    dom.farmIconPlay.classList.remove('hidden');
    dom.farmIconStop.classList.add('hidden');
    dom.btnFarm.classList.remove('farming');
    dom.statusDot.classList.remove('farming');
    dom.statusText.textContent = t('dashboard.status.online');
  }
}

dom.btnFarm.addEventListener('click', async () => {
  if (state.isFarming) {
    await window.phantom.stopFarm();
    state.isFarming = false;
    stopSessionTimer();
  } else {
    const gameIds = state.games.map(g => g.appId);
    if (gameIds.length === 0) return;
    await window.phantom.startFarm(gameIds);
    state.isFarming = true;
    startSessionTimer();
  }
  updateFarmButton();
});

function startSessionTimer() {
  state.sessionStart = Date.now();
  dom.sessionTime.textContent = '00:00:00';
  state.sessionInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    dom.sessionTime.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function stopSessionTimer() {
  clearInterval(state.sessionInterval);
  state.sessionInterval = null;
  state.sessionStart = null;
  dom.sessionTime.textContent = '00:00:00';
}

window.phantom.onFarmTick((data) => {
  state.farmHours = data.farmHours;
  updateStats();
  renderGameList();
});

window.phantom.onFarmingStopped(() => {
  state.isFarming = false;
  stopSessionTimer();
  updateFarmButton();
});

async function loadGames() {
  state.games = await window.phantom.getGames();
  state.farmHours = await window.phantom.getFarmHours();
  renderGameList();
  updateStats();
  updateFarmButton();
}

function renderGameList() {
  dom.gameList.querySelectorAll('.game-item').forEach(item => item.remove());
  if (state.games.length === 0) { dom.emptyGames.classList.remove('hidden'); return; }
  dom.emptyGames.classList.add('hidden');

  state.games.forEach(game => {
    const hours = (state.farmHours[String(game.appId)] || 0).toFixed(1);
    const el = document.createElement('div');
    el.className = 'game-item';
    el.innerHTML = `
      ${game.icon ? `<img class="game-item-icon" src="${game.icon}" alt="">` : `<div class="game-item-icon"></div>`}
      <div class="game-item-info">
        <div class="game-item-name">${escapeHtml(game.name || `App ${game.appId}`)}</div>
        <div class="game-item-meta">
          <span>${t('dashboard.games.appId')}: ${game.appId}</span>
          <span>${hours}${t('dashboard.games.hours')}</span>
        </div>
      </div>
      <button class="game-item-remove" data-appid="${game.appId}" title="Remover">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    dom.gameList.appendChild(el);
  });

  dom.gameList.querySelectorAll('.game-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeGame(Number(btn.dataset.appid)));
  });
}

async function addGame(game) {
  if (state.games.some(g => g.appId === game.appId)) return;
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
  if (!isNaN(appId) && appId > 0) {
    addGame({ appId, name: `App ${appId}`, icon: '' });
    dom.inputSearch.value = '';
    dom.searchResults.classList.add('hidden');
  }
});

dom.inputSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); dom.btnAddGame.click(); } });

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
    const el = document.createElement('div');
    el.className = 'search-item';
    el.innerHTML = `${item.icon ? `<img src="${item.icon}" alt="">` : ''}<div class="search-item-info"><div class="search-item-name">${escapeHtml(item.name)}</div><div class="search-item-id">AppID: ${item.appId}</div></div>`;
    el.addEventListener('click', () => { addGame({ appId: item.appId, name: item.name, icon: item.icon }); dom.inputSearch.value = ''; dom.searchResults.classList.add('hidden'); });
    dom.searchResults.appendChild(el);
  });
  dom.searchResults.classList.remove('hidden');
}

dom.btnLogout.addEventListener('click', async () => {
  if (state.isFarming) { await window.phantom.stopFarm(); stopSessionTimer(); state.isFarming = false; }
  await window.phantom.logout();
  state.games = []; state.farmHours = {};
  showScreen('login');
  dom.inputPassword.value = '';
});

window.phantom.onDisconnected(() => {
  state.isFarming = false;
  stopSessionTimer();
  showScreen('login');
  showError(t('error.disconnected'));
});

dom.btnMinimize.addEventListener('click', () => window.phantom.minimizeWindow());
dom.btnClose.addEventListener('click', () => window.phantom.closeWindow());

dom.btnLang.addEventListener('click', async () => {
  currentLang = currentLang === 'pt' ? 'en' : 'pt';
  await window.phantom.setLanguage(currentLang);
  applyTranslations(); renderGameList(); updateFarmButton();
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

(async function init() {
  currentLang = await window.phantom.getLanguage() || 'pt';
  applyTranslations();
  const creds = await window.phantom.getCredentials();
  if (creds) { dom.inputUsername.value = creds.username; dom.inputPassword.value = creds.password; dom.checkRemember.checked = true; }
  await loadGames();
})();
