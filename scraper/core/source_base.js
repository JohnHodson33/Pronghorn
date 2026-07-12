// Base class every source adapter extends. Provides the stealth-Chrome lifecycle,
// polite delays, money parsing, prefixed logging, and the createListing shortcut.
// An adapter only has to implement scrape() and return { listings, stats }.

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const log = require('../utils/logger');
const { createListing, parseMoney } = require('./listing');

puppeteerExtra.use(StealthPlugin());

const DEFAULT_CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

class SourceScraper {
  /**
   * @param {string} name          Registry key, e.g. "bizbuysell" — used as the Listing.source prefix
   * @param {Object} sourceConfig  This source's block from config.json sources
   * @param {Object} globalConfig  Full config.json (for chrome_path, filters, etc.)
   */
  constructor(name, sourceConfig = {}, globalConfig = {}) {
    this.name = name;
    this.config = sourceConfig;
    this.globalConfig = globalConfig;
  }

  info(msg)  { log.info(`[${this.name}] ${msg}`); }
  warn(msg)  { log.warn(`[${this.name}] ${msg}`); }
  error(msg) { log.error(`[${this.name}] ${msg}`); }

  sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  parseMoney(val) { return parseMoney(val); }

  /**
   * fetch() with retry + exponential backoff on transient failures (429, 5xx,
   * and socket/TLS/network errors like undici's "fetch failed"). Returns the
   * Response. Shared so single-request SSR adapters don't silently drop a
   * source on a momentary network blip during the nightly run.
   */
  async fetchRetry(url, opts = {}, tries = 4) {
    let lastErr;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const res = await fetch(url, opts);
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (err) {
        lastErr = err;
        const msg = `${err.message} ${err.cause ? err.cause.code || err.cause.message || '' : ''}`;
        const transient = /HTTP (429|5\d\d)|fetch failed|ECONN|ETIMEDOUT|EAI_AGAIN|socket|network|TLS|UND_ERR/i.test(msg);
        if (!transient || attempt === tries) break;
        const backoff = 1500 * 2 ** (attempt - 1); // 1.5s, 3s, 6s
        this.warn(`fetch ${err.message} — retry ${attempt}/${tries - 1} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
    throw lastErr;
  }

  /** Build a canonical Listing tagged with this source's name. */
  listing(fields) { return createListing(this.name, fields); }

  /**
   * Launch stealth Chrome, hand it to fn, and guarantee teardown.
   * Sources that don't need a browser (RSS, APIs) simply never call this.
   */
  async withBrowser(fn) {
    this.info('Launching Chrome (stealth mode)');
    const browser = await puppeteerExtra.launch({
      executablePath: this.globalConfig.chrome_path || process.env.CHROME_PATH || DEFAULT_CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      return await fn(browser);
    } finally {
      await browser.close();
      this.info('Browser closed');
    }
  }

  /**
   * @returns {Promise<{listings: import('./listing').Listing[], stats: Object}>}
   */
  async scrape() {
    throw new Error(`Source "${this.name}" does not implement scrape()`);
  }
}

module.exports = SourceScraper;
