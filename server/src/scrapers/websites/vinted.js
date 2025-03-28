const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// Enable stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Helper function to create a delay using Promise and setTimeout
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after the specified delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extracts Lego set number from title, description, or URL
 * @param {String} text - Text to extract set number from (title/description)
 * @param {String} url - URL to extract set number from
 * @returns {String|null} Lego set number or null if not found
 */
const extractLegoSetNumber = (text, url = '') => {
  const directMatch = text.match(/(?:LEGO|Set|Ref|Référence|N°)\s*(\d{4,6})/i);
  if (directMatch) return directMatch[1];

  const parenthesesMatch = text.match(/\(\d{4,6}\)/);
  if (parenthesesMatch) {
    const setNumber = parenthesesMatch[0].replace(/[\(\)]/g, '');
    if (setNumber.length >= 4 && setNumber.length <= 6) return setNumber;
  }

  const numberMatches = text.match(/\b\d{4,6}\b/g);
  if (numberMatches) {
    for (const match of numberMatches) {
      if (!text.toLowerCase().includes(`${match} pièces`)) return match;
    }
  }

  if (url) {
    const urlSetMatch = url.match(/[\-_](\d{4,6})[\-_]/);
    if (urlSetMatch) return urlSetMatch[1];
    const urlMatches = url.match(/\b\d{4,6}\b/g);
    if (urlMatches) return urlMatches[0];
  }

  return null;
};

/**
 * Clean up price data and convert to float
 * @param {String} priceText - Price text to clean
 * @returns {Number|null} Cleaned price as float or null
 */
const cleanPrice = (priceText) => {
  if (!priceText) return null;
  const sanitized = priceText.replace(/[^\d,\.]/g, '').replace(',', '.');
  const price = parseFloat(sanitized);
  return isNaN(price) ? null : price;
};

/**
 * Check if text contains LEGO-related keywords
 * @param {String} text - Text to check
 * @returns {Boolean} True if text contains LEGO-related keywords
 */
const isLegoRelated = (text) => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const keywords = ['lego', 'duplo', 'technic', 'ninjago', 'minifig', 'minifigurine', 'brique', 'briques'];
  return keywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Convert condition text to a numerical scale
 * @param {String} conditionText - Condition text to convert
 * @returns {Number} Numerical condition value
 */
const getConditionScale = (conditionText) => {
  if (!conditionText) return 0;
  const condition = conditionText.toLowerCase();
  if (condition.includes('neuf avec étiquette')) return 1;
  if (condition.includes('neuf sans étiquette')) return 2;
  if (condition.includes('très bon état')) return 3;
  if (condition.includes('bon état')) return 4;
  if (condition.includes('satisfaisant')) return 5;
  return 0;
};

/**
 * Parse HTML data from vinted.fr search/list pages
 * @param {String} data - HTML response
 * @param {String|null} searchSetNumber - The set number from the search query
 * @return {Array} Array of sale objects
 */
const parseSearchResults = (data, searchSetNumber = null) => {
  const $ = cheerio.load(data);
  return $('.feed-grid__item, .new-item-box__container')
    .map((i, element) => {
      const imageElement = $(element).find('img.web_ui__Image__content');
      const altText = imageElement.attr('alt') || '';
      if (!isLegoRelated(altText)) return undefined;

      const linkElement = $(element).find('a.new-item-box__overlay--clickable');
      const link = linkElement.attr('href') || '';
      const fullLink = link.startsWith('http') ? link : `https://www.vinted.fr${link}`;

      if (searchSetNumber) {
        const combinedText = `${altText} ${fullLink}`.toLowerCase();
        if (!combinedText.includes(searchSetNumber.toLowerCase())) return undefined;
      }

      let title = '';
      const titleMatch = altText.match(/^([^,]+)/);
      if (titleMatch) title = titleMatch[1].trim();

      const conditionMatch = altText.match(/état:\s*([^,]+)/i);
      const conditionText = conditionMatch ? conditionMatch[1].trim() : 'Unknown';
      const condition = getConditionScale(conditionText);

      const priceElement = $(element).find('[data-testid$="--price-text"]');
      const priceText = priceElement.text().trim();
      const price = cleanPrice(priceText);

      const favoritesElement = $(element).find('button[data-testid$="--favourite"] .web_ui__Text__caption');
      const favoritesText = favoritesElement.text().trim();
      const favoritesCount = favoritesText ? parseInt(favoritesText) : 0;

      const setNumber = searchSetNumber || extractLegoSetNumber(altText, fullLink);
      const imageUrl = imageElement.attr('src') || '';

      return { setNumber, title, price, link: fullLink, condition, favoritesCount, imageUrl };
    })
    .get()
    .filter(item => item !== undefined);
};

/**
 * Parse HTML data from a single vinted.fr product page
 * @param {String} data - HTML response
 * @param {String} url - Original URL for the product link
 * @return {Array} Array of sale objects (single sale for product pages)
 */
const parseProductPage = (data, url) => {
  const $ = cheerio.load(data);
  const titleSelectors = ['h1[itemprop="name"]', '.web_ui__Text__title', '.item-details h1'];
  let title = '';
  for (const selector of titleSelectors) {
    const element = $(selector);
    if (element.length) {
      title = element.text().trim();
      break;
    }
  }
  if (!title) title = $('title').text().trim();

  const descriptionSelectors = [
    '[itemprop="description"]',
    '[data-testid="item-description"] .web_ui__Text__body',
    '.item-description'
  ];
  let description = '';
  for (const selector of descriptionSelectors) {
    const element = $(selector);
    if (element.length) {
      description = element.text().trim();
      break;
    }
  }

  if (!isLegoRelated(title) && !isLegoRelated(description)) return [];

  const priceSelectors = [
    '.item-price__current-price',
    '[data-testid="item-price"] .web_ui__Text__subtitle',
    '.item-details__price'
  ];
  let priceText = '';
  for (const selector of priceSelectors) {
    const element = $(selector);
    if (element.length) {
      priceText = element.text().trim();
      break;
    }
  }
  const price = cleanPrice(priceText);

  const conditionSelectors = [
    '.item-attributes__attribute:contains("État") .item-attributes__value',
    '[data-testid="item-attributes-status"] .web_ui__Text__bold',
    '.details-list__item:contains("État") .details-list__value'
  ];
  let conditionText = 'Unknown';
  for (const selector of conditionSelectors) {
    const element = $(selector);
    if (element.length) {
      conditionText = element.text().trim();
      break;
    }
  }
  const condition = getConditionScale(conditionText);

  const setNumber = extractLegoSetNumber(title + ' ' + description, url);

  const imageSelectors = ['.item-photos__photo img', '.item-photos img', '.web_ui__Image__content'];
  let imageUrl = '';
  for (const selector of imageSelectors) {
    const element = $(selector);
    if (element.length) {
      imageUrl = element.attr('src') || '';
      break;
    }
  }

  let favoritesCount = 0;
  const favoritesSelectors = [
    '[data-testid="favourite-button"] .web_ui__Text__text',
    '.item-favourite-count',
    '.item-actions__favourites .web_ui__Text__body'
  ];
  for (const selector of favoritesSelectors) {
    const element = $(selector);
    if (element.length) {
      const favoritesText = element.text().trim();
      favoritesCount = favoritesText ? parseInt(favoritesText.replace(/[^\d]/g, '')) || 0 : 0;
      if (favoritesCount > 0) break;
    }
  }
  if (favoritesCount === 0) {
    const ariaLabelElement = $('[data-testid="favourite-button"]');
    const ariaLabel = ariaLabelElement.attr('aria-label') || '';
    const ariaMatch = ariaLabel.match(/par\s+(\d+)\s+utilisateur/i);
    if (ariaMatch) favoritesCount = parseInt(ariaMatch[1]) || 0;
  }

  return [{ setNumber, title, price, link: url, condition, favoritesCount, imageUrl }];
};

/**
 * Save sales to file, updating existing entries based on source
 * @param {Array} newSales - Array of sale objects to save
 * @param {String} filePath - Path to save the file
 * @param {boolean} isProductPage - Whether the sales come from a product page
 */
const saveSalesToFile = async (newSales, filePath, isProductPage) => {
  try {
    const fileDir = path.dirname(filePath);
    await fs.mkdir(fileDir, { recursive: true });

    let existingSales = [];
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      existingSales = JSON.parse(fileData);
    } catch (err) {
      console.log(`Creating new sales file at ${filePath}`);
    }

    const existingSalesMap = new Map();
    existingSales.forEach(sale => {
      if (sale.link) existingSalesMap.set(sale.link, sale);
    });

    const newSalesMap = new Map();
    newSales.forEach(newSale => {
      if (newSale.link) newSalesMap.set(newSale.link, newSale);
    });
    const dedupedNewSales = Array.from(newSalesMap.values());

    dedupedNewSales.forEach(newSale => {
      const key = newSale.link;
      if (!key) return;
      if (existingSalesMap.has(key)) {
        const existingIndex = existingSales.findIndex(s => s.link === newSale.link);
        if (existingIndex !== -1) {
          if (isProductPage) {
            existingSales[existingIndex] = { ...newSale };
          } else {
            existingSales[existingIndex] = {
              ...existingSales[existingIndex],
              price: newSale.price,
              favoritesCount: newSale.favoritesCount,
            };
          }
        }
      } else {
        existingSales.push(newSale);
      }
    });

    await fs.writeFile(filePath, JSON.stringify(existingSales, null, 2));
  } catch (error) {
    console.error(`❌ Error saving sales to file: ${error.message}`);
  }
};

/**
 * Scrape sales from vinted.fr with retry mechanism
 * @param {String} url - URL to scrape
 * @returns {Array} Array of sale objects
 */
module.exports.scrape = async (url) => {
  const maxRetries = 5;
  let attempt = 0;

  const isProductPage = url.includes('/items/');
  let searchSetNumber = null;
  if (!isProductPage) {
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    searchSetNumber = urlParams.get('search_text') || null;
  }

  while (attempt < maxRetries) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-default-apps',
          '--disable-domain-reliability',
          '--disable-extensions',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-notifications',
          '--disable-offer-store-unmasked-wallet-cards',
          '--disable-popup-blocking',
          '--disable-print-preview',
          '--disable-prompt-on-repost',
          '--disable-renderer-backgrounding',
          '--disable-speech-api',
          '--disable-sync',
          '--disk-cache-size=33554432',
          '--hide-scrollbars',
          '--ignore-gpu-blacklist',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-pings',
          '--password-store=basic',
          '--use-gl=swiftshader',
          '--use-mock-keychain',
          '--window-size=1920,1080'
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
      });

      let navigationSuccess = false;
      for (let navAttempt = 0; navAttempt < 3; navAttempt++) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
          navigationSuccess = true;
          break;
        } catch (navError) {
          console.warn(`Navigation attempt ${navAttempt + 1} failed: ${navError.message}`);
          await delay(5000);
        }
      }
      if (!navigationSuccess) throw new Error('All navigation attempts failed');

      await delay(5000);

      try {
        const cookieSelector = '[id*="cookie"] button, [class*="cookie"] button, [id*="consent"] button';
        const cookieButton = await page.$(cookieSelector);
        if (cookieButton) {
          await cookieButton.click();
          await delay(1000);
        }
      } catch (e) {
        console.log('No cookie banner or error handling it:', e.message);
      }

      let body;
      let sales = [];
      if (isProductPage) {
        await Promise.race([
          page.waitForSelector('.item-details', { timeout: 30000 }),
          page.waitForSelector('[data-testid="item-price"]', { timeout: 30000 }),
          page.waitForSelector('.item-page-sidebar-content', { timeout: 30000 }),
          page.waitForSelector('.details-list', { timeout: 30000 })
        ]).catch(e => console.log('Warning: Product page selectors not found:', e.message));
        await delay(2000);
        body = await page.content();
        sales = parseProductPage(body, url);
      } else {
        await Promise.race([
          page.waitForSelector('.feed-grid__item', { timeout: 60000 }),
          page.waitForSelector('.new-item-box__container', { timeout: 60000 })
        ]).catch(e => console.log('Warning: Search page selectors not found:', e.message));
        let previousHeight;
        for (let i = 0; i < 5; i++) {
          previousHeight = await page.evaluate('document.body.scrollHeight');
          await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
          await delay(2000);
          const newHeight = await page.evaluate('document.body.scrollHeight');
          if (newHeight === previousHeight) break;
        }
        await delay(2000);
        body = await page.content();
        sales = parseSearchResults(body, searchSetNumber);
      }

      await browser.close();

      if (sales.length > 0 || (isProductPage && sales.length === 0)) {
        const filePath = path.resolve(__dirname, '../../../data/sales_vinted.json');
        await saveSalesToFile(sales, filePath, isProductPage);
        return sales;
      } else {
        throw new Error('No Lego sales found in the parsed content');
      }
    } catch (e) {
      attempt++;
      console.error(`❌ Attempt ${attempt} failed for ${url}:`, e.message);
      if (browser) await browser.close().catch(() => {});
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} attempts failed for ${url}`);
        return [];
      }
      await delay(5000 * attempt);
    }
  }
  return [];
};