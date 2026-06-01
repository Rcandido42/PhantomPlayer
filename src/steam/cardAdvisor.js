const https = require('https');

class CardAdvisor {
  constructor() {
    this.cookies = null;
    this.steamId = null;
  }

  setCookies(cookies) {
    this.cookies = cookies;
  }

  setSteamId(steamId) {
    this.steamId = steamId;
  }

  /**
   * Makes an HTTPS GET request with optional cookies.
   * Returns the response body as a string.
   */
  _httpGet(url, useCookies = false) {
    return new Promise((resolve, reject) => {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      };

      if (useCookies && this.cookies) {
        const cookieStr = Array.isArray(this.cookies)
          ? this.cookies.join('; ')
          : this.cookies;
        headers['Cookie'] = cookieStr;
      }

      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers
      };

      const req = https.request(options, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this._httpGet(res.headers.location, useCookies).then(resolve).catch(reject);
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
      req.end();
    });
  }

  /**
   * Delays execution by the specified milliseconds.
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetches all games with remaining card drops from the badges page.
   * Scrapes steamcommunity.com/profiles/{steamId}/badges/ using authenticated cookies.
   * Returns [{ appId, cardsRemaining }]
   */
  async fetchGamesWithCardDrops(progressCallback) {
    if (!this.cookies || !this.steamId) {
      throw new Error('Cookies or SteamID not set. Please log in first.');
    }

    const allGames = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      if (progressCallback) progressCallback({ phase: 'badges', page });

      const url = `https://steamcommunity.com/profiles/${this.steamId}/badges/?p=${page}`;
      const html = await this._httpGet(url, true);

      // Extract badge rows with card drops remaining
      // Pattern: looks for links to /gamecards/APPID/ near "X card drop(s) remaining"
      const badgeRowRegex = /href="[^"]*\/gamecards\/(\d+)\/"[\s\S]*?(\d+)\s+card\s+drop(?:s)?\s+remaining/gi;
      let match;
      let foundOnPage = 0;

      while ((match = badgeRowRegex.exec(html)) !== null) {
        const appId = parseInt(match[1], 10);
        const cardsRemaining = parseInt(match[2], 10);

        if (appId > 0 && cardsRemaining > 0) {
          // Avoid duplicates
          if (!allGames.some(g => g.appId === appId)) {
            allGames.push({ appId, cardsRemaining });
            foundOnPage++;
          }
        }
      }

      // Check if there's a next page link
      hasMore = html.includes(`?p=${page + 1}`);
      page++;

      // Safety: max 20 pages to prevent infinite loops
      if (page > 20) hasMore = false;

      if (hasMore) await this._delay(1500);
    }

    return allGames;
  }

  /**
   * Fetches the average price of normal (non-foil) trading cards for a given game.
   * Uses the public Steam Community Market search API (no auth required).
   * Returns { avgPrice, currency, cardCount } or null if no cards found.
   */
  async fetchCardPrices(appId) {
    try {
      const url = `https://steamcommunity.com/market/search/render/?appid=753&category_753_cardborder[]=tag_cardborder_0&category_753_Game[]=tag_app_${appId}&norender=1&count=100`;
      const raw = await this._httpGet(url, false);
      const data = JSON.parse(raw);

      if (!data.success || !data.results || data.results.length === 0) {
        return null;
      }

      let totalPrice = 0;
      let count = 0;
      let currency = '';

      for (const item of data.results) {
        if (item.sell_price && item.sell_price > 0) {
          totalPrice += item.sell_price; // price in cents
          count++;
          if (!currency && item.sell_price_text) {
            // Extract currency symbol from the price text (e.g., "R$ 0,10" → "R$")
            currency = item.sell_price_text.replace(/[\d.,\s]/g, '').trim();
          }
        }
      }

      if (count === 0) return null;

      return {
        avgPrice: Math.round(totalPrice / count), // in cents
        currency: currency || '?',
        cardCount: count
      };
    } catch (err) {
      console.error(`Error fetching card prices for appId ${appId}:`, err.message);
      return null;
    }
  }

  /**
   * Main method: gets full recommendations sorted by estimated profit.
   * progressCallback({ phase, current, total, gameName }) is called for UI updates.
   * Returns [{ appId, name, cardsRemaining, avgPrice, estimatedProfit, currency }]
   */
  async getRecommendations(ownedGames, progressCallback) {
    // Phase 1: Fetch games with card drops
    if (progressCallback) progressCallback({ phase: 'badges', current: 0, total: 0 });
    const gamesWithDrops = await this.fetchGamesWithCardDrops(progressCallback);

    if (gamesWithDrops.length === 0) {
      return [];
    }

    // Build a name map from owned games for display
    const nameMap = {};
    if (ownedGames && ownedGames.length > 0) {
      for (const g of ownedGames) {
        nameMap[g.appId] = g.name;
      }
    }

    // Phase 2: Fetch prices for each game
    const recommendations = [];
    const total = gamesWithDrops.length;

    for (let i = 0; i < total; i++) {
      const game = gamesWithDrops[i];
      const gameName = nameMap[game.appId] || `App ${game.appId}`;

      if (progressCallback) {
        progressCallback({ phase: 'prices', current: i + 1, total, gameName });
      }

      const priceData = await this.fetchCardPrices(game.appId);

      if (priceData) {
        recommendations.push({
          appId: game.appId,
          name: gameName,
          cardsRemaining: game.cardsRemaining,
          avgPrice: priceData.avgPrice,
          estimatedProfit: priceData.avgPrice * game.cardsRemaining,
          currency: priceData.currency,
          cardCount: priceData.cardCount
        });
      }

      // Rate limit: 3 second delay between market requests
      if (i < total - 1) {
        await this._delay(3000);
      }
    }

    // Sort by estimated profit (highest first)
    recommendations.sort((a, b) => b.estimatedProfit - a.estimatedProfit);

    return recommendations;
  }
}

module.exports = CardAdvisor;
