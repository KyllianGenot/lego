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
 * Extracts Lego set number from title or URL
 * @param {String} text - Text to extract set number from (title)
 * @param {String} url - URL to extract set number from
 * @returns {String|null} Lego set number or null if not found
 */
const extractLegoSetNumber = (text, url = '') => {
  // Try to find a number in parentheses (common format for set numbers)
  const parenthesesMatch = text.match(/\(\d{4,6}\)/);
  if (parenthesesMatch) {
    const setNumber = parenthesesMatch[0].replace(/[\(\)]/g, '');
    if (setNumber.length >= 4 && setNumber.length <= 6) {
      return setNumber;
    }
  }

  // Look for a standalone 4-6 digit number in the title
  const titleMatches = text.match(/\b\d{4,6}\b/g);
  if (titleMatches) {
    for (const match of titleMatches) {
      if (!text.toLowerCase().includes(`${match} pièces`)) {
        return match;
      }
    }
  }

  // Try to extract from the URL
  const urlMatches = url.match(/\b\d{4,6}\b/g);
  if (urlMatches) {
    return urlMatches[0];
  }

  return null;
};

/**
 * Clean up price data without rounding
 * @param {String} priceText - Price text to clean
 * @returns {Number|null} Cleaned price or null if invalid
 */
const cleanPrice = (priceText) => {
  if (!priceText) return null;

  // Match the first valid number (integer or decimal)
  const priceMatch = priceText.match(/(\d+([.,]\d+)?)/);
  if (!priceMatch) return null;

  const sanitized = priceMatch[0].replace(',', '.');
  const price = parseFloat(sanitized);
  return isNaN(price) ? null : price;
};

/**
 * Parse relative time like "Publié il y a 3 h"
 * @param {String} timeText - Time text to parse
 * @returns {Date|null} Approximated date or null if parsing fails
 */
const parseRelativeTime = (timeText) => {
  if (!timeText) return null;

  const daysMatch = timeText.match(/(\d+)\s*j/);
  const hoursMatch = timeText.match(/(\d+)\s*h/);
  const minutesMatch = timeText.match(/(\d+)\s*min/);

  const days = daysMatch ? parseInt(daysMatch[1]) : 0;
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

  if (days === 0 && hours === 0 && minutes === 0) return null;

  const now = new Date();
  const approxDate = new Date(now);
  approxDate.setDate(approxDate.getDate() - days);
  approxDate.setHours(approxDate.getHours() - hours);
  approxDate.setMinutes(approxDate.getMinutes() - minutes);

  return approxDate;
};

/**
 * Parse HTML data from dealabs.com search/list pages
 * @param {String} data - HTML response
 * @return {Array} Array of deal objects
 */
const parseSearchResults = (data) => {
  const $ = cheerio.load(data);

  let threadsData = {};
  const jsonLdScript = $('script[type="application/ld+json"]').html();
  if (jsonLdScript) {
    try {
      const jsonLd = JSON.parse(jsonLdScript);
      const threadItems = jsonLd['@graph']?.filter(item => item['@type'] === 'DiscussionForumPosting') || [];
      threadItems.forEach(item => {
        const threadIdMatch = item.url?.match(/\/(\d+)$/);
        if (threadIdMatch && item.datePublished) {
          threadsData[threadIdMatch[1]] = new Date(item.datePublished);
        }
      });
    } catch (e) {
      console.warn('Failed to parse JSON-LD in search results:', e.message);
    }
  }

  return $('.threadListCard')
    .map((i, element) => {
      const titleElement = $(element).find('.cept-tt.thread-link');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      if (!title.toLowerCase().includes('lego')) return undefined;

      const setNumber = extractLegoSetNumber(title, link);

      const priceElement = $(element).find('.thread-price');
      const priceText = priceElement.length ? priceElement.text().trim() : '';
      const price = cleanPrice(priceText);

      if (!price) return undefined;

      const temperatureElement = $(element).find('.cept-vote-temp');
      const temperatureText = temperatureElement.text().trim();
      const temperature = temperatureText ? parseInt(temperatureText.replace('°', '')) : 0;

      let postedDate = null;
      const threadIdMatch = link.match(/\/(\d+)$/);
      if (threadIdMatch && threadsData[threadIdMatch[1]]) {
        postedDate = threadsData[threadIdMatch[1]];
      } else {
        const postedTimeElement = $(element).find('.chip--type-default .size--all-s');
        const timestampText = postedTimeElement.text().trim() || '';
        postedDate = parseRelativeTime(timestampText) || null;
      }

      const shippingElement = $(element).find('.icon--truck').parent().find('.overflow--wrap-off');
      const shippingText = shippingElement.text().trim();
      const freeShipping = shippingText.toLowerCase().includes('gratuit');
      if (!freeShipping && shippingText) {
        const shippingCost = cleanPrice(shippingText);
        if (shippingCost) {
          price += shippingCost;
        }
      }

      const commentsElement = $(element).find('a[title="Commentaires"]');
      const commentsText = commentsElement.text().trim();
      const commentsCount = commentsText ? parseInt(commentsText) : 0;

      const imageElement = $(element).find('.threadListCard-image img');
      let imageUrl = '';
      const srcset = imageElement.attr('srcset');
      if (srcset) {
        const srcsetOptions = srcset.split(',').map(opt => opt.trim());
        const highestRes = srcsetOptions.reduce((prev, curr) => {
          const currRes = parseInt(curr.match(/(\d+)x\d+/)?.[1] || 0);
          const prevRes = parseInt(prev.match(/(\d+)x\d+/)?.[1] || 0);
          return currRes > prevRes ? curr : prev;
        }, srcsetOptions[0]);
        imageUrl = highestRes.split(' ')[0];
      } else {
        imageUrl = imageElement.attr('src') || '';
      }

      return {
        setNumber,
        title,
        price,
        link: link.startsWith('http') ? link : `https://www.dealabs.com${link}`,
        temperature,
        postedDate: postedDate ? postedDate.toISOString() : null,
        freeShipping,
        commentsCount,
        imageUrl,
      };
    })
    .get()
    .filter(item => item !== undefined);
};

/**
 * Parse HTML data from a single dealabs.com product page
 * @param {String} data - HTML response
 * @param {String} url - Original URL for the deal link
 * @return {Array} Array of deal objects (single deal for product pages)
 */
const parseProductPage = (data, url) => {
  const $ = cheerio.load(data);

  const titleElement = $('.thread-title span').first();
  const title = titleElement.text().trim() || $('h1').text().trim() || $('title').text().trim();

  if (!title.toLowerCase().includes('lego')) return [];

  const setNumber = extractLegoSetNumber(title, url);

  const priceElement = $('.threadItemCard-price, .thread-price').first();
  const priceText = priceElement.text().trim();
  let price = cleanPrice(priceText);

  const temperatureElement = $('.cept-vote-temp').first();
  const temperatureText = temperatureElement.text().trim();
  const temperature = temperatureText ? parseInt(temperatureText.replace('°', '')) : 0;

  let postedDate = null;
  const postedTimeElement = $('.size--all-s.color--text-TranslucentSecondary[title]').first();
  const timestampText = postedTimeElement.attr('title') || '';
  if (timestampText) {
    const months = {
      'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
      'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };
    const match = timestampText.match(/(\d+)\s*(\w+)\s*(\d+),\s*(\d+):(\d+):(\d+)/);
    if (match) {
      const [_, day, monthStr, year, hours, minutes, seconds] = match;
      const month = months[monthStr.toLowerCase()];
      postedDate = new Date(Date.UTC(parseInt(year), month, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds)));
    }
  }

  const shippingElement = $('.icon--truck').parent().find('.overflow--wrap-off').first();
  const shippingText = shippingElement.text().trim();
  const freeShipping = shippingText.toLowerCase().includes('gratuit');
  if (!freeShipping && shippingText) {
    const shippingCost = cleanPrice(shippingText);
    if (shippingCost) {
      price = price ? price + shippingCost : shippingCost;
    }
  }

  const commentsElement = $('h2.flex--inline.boxAlign-ai--all-c span.size--all-l, h2.flex--inline.boxAlign-ai--all-c span.size--fromW3-xl').first();
  const commentsText = commentsElement.text().trim();
  const commentsCountMatch = commentsText.match(/(\d+)\s*commentaires/);
  let commentsCount = commentsCountMatch ? parseInt(commentsCountMatch[1]) : 0;

  if (commentsCount === 0) {
    const jsonLdScript = $('script[type="application/ld+json"]').html();
    if (jsonLdScript) {
      try {
        const jsonLd = JSON.parse(jsonLdScript);
        const interactionStats = jsonLd['@type'] === 'DiscussionForumPosting' ? jsonLd.interactionStatistic : jsonLd['@graph']?.find(item => item['@type'] === 'DiscussionForumPosting')?.interactionStatistic;
        if (interactionStats && Array.isArray(interactionStats)) {
          const commentStat = interactionStats.find(stat => stat.interactionType['@type'] === 'https://schema.org/CommentAction');
          if (commentStat) {
            commentsCount = commentStat.userInteractionCount || 0;
          }
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD for comments:', e.message);
      }
    }
  }

  const imageElement = $('.threadItemCard-img picture').first();
  let imageUrl = '';
  const sourceElement = imageElement.find('source[media="(min-width: 768px)"]').first();
  if (sourceElement.length) {
    imageUrl = sourceElement.attr('srcset') || '';
  } else {
    imageUrl = imageElement.find('img').first().attr('src') || '';
  }

  return [{
    setNumber,
    title,
    price,
    link: url,
    temperature,
    postedDate: postedDate ? postedDate.toISOString() : null,
    freeShipping,
    commentsCount,
    imageUrl,
  }];
};

/**
 * Save deals to file, updating existing entries based on source
 * @param {Array} newDeals - Array of deal objects to save
 * @param {String} filePath - Path to save the file
 * @param {boolean} isProductPage - Whether the deals come from a product page
 */
const saveDealsToFile = async (newDeals, filePath, isProductPage) => {
  try {
    const fileDir = path.dirname(filePath);
    await fs.mkdir(fileDir, { recursive: true });

    let existingDeals = [];
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      existingDeals = JSON.parse(fileData);
    } catch (err) {
      console.log(`Creating new deals file at ${filePath}`);
    }

    const existingDealsMap = new Map(existingDeals.map(deal => [deal.link, deal]));

    newDeals.forEach(newDeal => {
      const key = newDeal.link;
      if (!key) return;

      if (existingDealsMap.has(key)) {
        const existingDeal = existingDealsMap.get(key);
        if (isProductPage) {
          Object.assign(existingDeal, newDeal);
        } else {
          existingDeal.temperature = newDeal.temperature;
          existingDeal.commentsCount = newDeal.commentsCount;
        }
      } else {
        existingDeals.push(newDeal);
        existingDealsMap.set(key, newDeal);
      }
    });

    await fs.writeFile(filePath, JSON.stringify(existingDeals, null, 2));
  } catch (error) {
    console.error(`❌ Error saving deals to file: ${error.message}`);
  }
};

/**
 * Scrape deals from dealabs.com with retry mechanism
 * @param {String} url - URL to scrape
 * @returns {Array} Array of deal objects
 */
module.exports.scrape = async (url) => {
  const maxRetries = 3;
  let attempt = 0;

  const isProductPage = url.includes('/bons-plans/') && !url.includes('search');

  while (attempt < maxRetries) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

      const page = await browser.newPage();

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
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
      let deals = [];

      if (isProductPage) {
        await page.waitForSelector('.threadItemCard-content, article[data-handler="history thread-click"]', { timeout: 30000 });
        body = await page.content();
        deals = parseProductPage(body, url);
      } else {
        await page.waitForSelector('.threadListCard', { timeout: 90000 });
        body = await page.content();
        deals = parseSearchResults(body);
      }

      await browser.close();

      if (deals.length > 0 || (isProductPage && deals.length === 0)) {
        const filePath = path.resolve(__dirname, '../../../data/deals_dealabs.json');
        await saveDealsToFile(deals, filePath, isProductPage);
        return deals;
      } else {
        throw new Error('No Lego deals found in the parsed content');
      }
    } catch (e) {
      attempt++;
      console.error(`❌ Attempt ${attempt} failed for ${url}: ${e.message}`);
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} attempts failed for ${url}`);
        return [];
      }
      await delay(2000 * attempt);
    }
  }

  return [];
};