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
