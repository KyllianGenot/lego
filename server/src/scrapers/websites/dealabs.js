const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path'); // Add path module for resolving directories

// Enable stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Helper function to create a delay using Promise and setTimeout
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after the specified delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parse HTML data from dealabs.com search/list pages
 * @param {String} data - HTML response
 * @return {Array} Array of deal objects
 */
const parseSearchResults = (data) => {
  const $ = cheerio.load(data);

  return $('.threadListCard') // Container for each deal in search/list pages
    .map((i, element) => {
      const titleElement = $(element).find('.cept-tt.thread-link'); // Title selector
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      const priceElement = $(element).find('.thread-price'); // Price selector
      const price = priceElement.length ? parseFloat(priceElement.text().replace('€', '').replace(',', '.')) : null;

      // Temperature (e.g., "87°")
      const temperatureElement = $(element).find('.cept-vote-temp');
      const temperatureText = temperatureElement.text().trim();
      const temperature = temperatureText ? parseInt(temperatureText.replace('°', '')) : null;

      // Posted Time (e.g., "Posté il y a 9 h.")
      const postedTimeElement = $(element).find('.chip--type-default .size--all-s');
      const postedTime = postedTimeElement.text().trim();

      // Merchant (e.g., "Carrefour")
      const merchantElement = $(element).find('.color--text-TranslucentSecondary a.color--text-AccentBrand');
      const merchant = merchantElement.text().trim();

      // Shared By (e.g., "Partagé par ClemS")
      const sharedByElement = $(element).find('.color--text-TranslucentSecondary .overflow--ellipsis');
      const sharedByText = sharedByElement.text().trim();
      const sharedByMatch = sharedByText.match(/Partagé par (.+)/);
      const sharedBy = sharedByMatch ? sharedByMatch[1] : '';

      // Description (e.g., "Meilleure offre que le dernier deal...")
      const descriptionElement = $(element).find('.userHtml-content');
      const description = descriptionElement.text().trim();

      // Shipping Cost (e.g., "Gratuit")
      const shippingElement = $(element).find('.icon--truck').parent().find('.overflow--wrap-off');
      const shippingCost = shippingElement.text().trim() || 'Unknown';

      // Comments Count (e.g., "14")
      const commentsElement = $(element).find('a[title="Commentaires"]');
      const commentsText = commentsElement.text().trim();
      const commentsCount = commentsText ? parseInt(commentsText) : 0;

      // Image URL
      const imageElement = $(element).find('.threadListCard-image img');
      const imageUrl = imageElement.attr('src') || '';

      // Filter for Lego deals
      if (title.toLowerCase().includes('lego')) {
        return {
          title,
          price,
          link: link.startsWith('http') ? link : `https://www.dealabs.com${link}`,
          temperature,
          postedTime,
          merchant,
          sharedBy,
          description,
          shippingCost,
          commentsCount,
          imageUrl,
        };
      }
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

  // Extract product details
  const titleElement = $('.thread-title span') || $('h1');
  const title = titleElement.text().trim() || $('title').text().trim();

  const priceElement = $('.thread-price, .threadItemCard-price');
  const priceText = priceElement.text().trim();
  const price = priceText ? parseFloat(priceText.replace('€', '').replace(',', '.')) : null;

  // Temperature
  const temperatureElement = $('.cept-vote-temp');
  const temperatureText = temperatureElement.text().trim();
  const temperature = temperatureText ? parseInt(temperatureText.replace('°', '')) : null;

  // Posted Time
  const postedTimeElement = $('.size--all-s.color--text-TranslucentSecondary').filter(function () {
    return $(this).text().includes('Publié il y a');
  });
  const postedTime = postedTimeElement.text().trim() || 'Unknown';

  // Merchant
  const merchantElement = $('.color--text-TranslucentSecondary a.color--text-AccentBrand');
  const merchant = merchantElement.text().trim() || '';

  // Shared By
  const sharedByElement = $('.thread-user a');
  const sharedBy = sharedByElement.text().trim() || 'Unknown';

  // Description
  const descriptionElement = $('.userHtml-content');
  const description = descriptionElement.text().trim() || '';

  // Shipping Cost
  const shippingElement = $('.icon--truck').parent().find('.overflow--wrap-off');
  const shippingCost = shippingElement.text().trim() || 'Unknown';

  // Comments Count
  const commentsElement = $('a[title="Commentaires"]');
  const commentsText = commentsElement.text().trim();
  const commentsCount = commentsText ? parseInt(commentsText) : 0;

  // Image URL
  const imageElement = $('.thread-image, .carousel-thumbnail-img, .threadItemCard-img img');
  const imageUrl = imageElement.first().attr('src') || '';

  // Filter for Lego deals
  if (title.toLowerCase().includes('lego')) {
    return [{
      title,
      price,
      link: url,
      temperature,
      postedTime,
      merchant,
      sharedBy,
      description,
      shippingCost,
      commentsCount,
      imageUrl,
    }];
  }

  return [];
};

/**
 * Scrape deals from dealabs.com with retry and fallback mechanisms
 * @param {String} url - URL to scrape
 * @returns {Array} Array of deal objects
 */
module.exports.scrape = async (url) => {
  const maxRetries = 3;
  let attempt = 0;

  // If it's a direct product URL, handle it differently
  const isProductPage = url.includes('/bons-plans/') && !url.includes('search');

  while (attempt < maxRetries) {
    try {
      // Launch with more options to avoid detection
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

      // Set a more realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

      // Set viewport to mimic a real browser
      await page.setViewport({ width: 1366, height: 768 });

      // Bypass some common bot detections
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
      });

      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 90000, // 90-second timeout
      });

      // Add a small delay to allow JS to execute
      await delay(2000);

      let body;
      let deals = [];

      if (isProductPage) {
        // Wait for the product page content
        await page.waitForSelector('.threadItemCard-content, article[data-handler="history thread-click"]', { timeout: 30000 });

        body = await page.content();
        deals = parseProductPage(body, url);
      } else {
        // Wait for the search/list page content
        try {
          await page.waitForSelector('.threadListCard', { timeout: 30000 });
        } catch (e) {
          const selectors = [
            'article[data-handler="history thread-click"]',
            '.thread--deal',
            '.threadGrid',
          ];

          for (const selector of selectors) {
            try {
              await page.waitForSelector(selector, { timeout: 10000 });
              break;
            } catch (err) {
              console.log(`Selector ${selector} not found`);
            }
          }
        }

        body = await page.content();
        deals = parseSearchResults(body);
      }

      await browser.close();

      // Check if we got any deals
      if (deals.length > 0 || (isProductPage && deals.length === 0)) {
        // Save results to lego/server/data
        const dataDir = path.resolve(__dirname, '../../../data');
        await fs.mkdir(dataDir, { recursive: true });
        const filePath = path.join(dataDir, 'deals_dealabs.json');
        await fs.writeFile(filePath, JSON.stringify(deals, null, 2));
        return deals;
      } else {
        throw new Error('No deals found in the parsed content');
      }
    } catch (e) {
      attempt++;
      console.error(`❌ Attempt ${attempt} failed for ${url}:`, e.message);

      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} attempts failed for ${url}`);
        return [];
      }

      // Wait before retrying with exponential backoff
      await delay(2000 * attempt);
    }
  }

  return [];
};