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
 * Parse HTML data from vinted.fr search/list pages
 * @param {String} data - HTML response
 * @return {Array} Array of sale objects
 */
const parseSearchResults = (data) => {
  const $ = cheerio.load(data);

  return $('.new-item-box__container') // Container for each product
    .map((i, element) => {
      const imageElement = $(element).find('img.web_ui__Image__content'); // Image with alt text
      const altText = imageElement.attr('alt') || ''; // Full title from alt attribute

      // Extract title (up to "marque: LEGO" or end)
      const titleMatch = altText.match(/^(.*?)(?:, marque: LEGO|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

      // Extract brand (e.g., "LEGO")
      const brandMatch = altText.match(/marque: ([^,]+)/i);
      const brand = brandMatch ? brandMatch[1].trim() : 'LEGO'; // Default to LEGO since we filter for LEGO items

      // Extract condition (e.g., "Neuf avec étiquette")
      const conditionMatch = altText.match(/état: ([^,]+)/i);
      const condition = conditionMatch ? conditionMatch[1].trim() : 'Unknown';

      // Extract size (e.g., "58")
      const sizeMatch = altText.match(/taille: ([^,]+)/i);
      const size = sizeMatch ? sizeMatch[1].trim() : $(element).find('[data-testid$="--description-subtitle"]').text().trim() || 'N/A';

      // Extract price (e.g., "4,00 €")
      const priceElement = $(element).find('[data-testid$="--price-text"]');
      const priceText = priceElement.text().trim();
      const price = priceText ? parseFloat(priceText.replace('€', '').replace(',', '.')) : null;

      // Extract total price including buyer protection (e.g., "4,90 €")
      const totalPriceElement = $(element).find('button[aria-label*="Protection acheteurs incluse"] .web_ui__Text__subtitle');
      const totalPriceText = totalPriceElement.text().trim();
      const totalPrice = totalPriceText ? parseFloat(totalPriceText.replace('€', '').replace(',', '.')) : null;

      // Extract favorites count (e.g., "1")
      const favoritesElement = $(element).find('button[data-testid$="--favourite"] .web_ui__Text__caption');
      const favoritesCount = favoritesElement.text().trim() ? parseInt(favoritesElement.text().trim()) : 0;

      // Extract link
      const linkElement = $(element).find('a.new-item-box__overlay--clickable');
      const link = linkElement.attr('href');

      // Extract image URL
      const imageUrl = imageElement.attr('src') || '';

      // Filter for Lego items
      if (altText.toLowerCase().includes('lego')) {
        return {
          title,
          price,
          totalPrice,
          link: link.startsWith('http') ? link : `https://www.vinted.fr${link}`,
          brand,
          condition,
          size,
          favoritesCount,
          imageUrl,
        };
      }
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

  // Extract title
  const titleElement = $('.web_ui__Text__title');
  const title = titleElement.text().trim() || $('title').text().trim();

  // Extract price (e.g., "6,00 €")
  const priceElement = $('[data-testid="item-price"] .web_ui__Text__subtitle');
  const priceText = priceElement.text().trim();
  const price = priceText ? parseFloat(priceText.replace('€', '').replace(',', '.')) : null;

  // Extract total price including buyer protection (e.g., "7,00 €")
  const totalPriceElement = $('button[aria-label*="Protection acheteurs incluse"] .web_ui__Text__title');
  const totalPriceText = totalPriceElement.text().trim();
  const totalPrice = totalPriceText ? parseFloat(totalPriceText.replace('€', '').replace(',', '.')) : null;

  // Extract brand (e.g., "no name")
  const brandElement = $('[itemprop="name"]');
  const brand = brandElement.text().trim() || 'Unknown';

  // Extract condition (e.g., "Très bon état")
  const conditionElement = $('[data-testid="item-attributes-status"] .web_ui__Text__bold');
  const condition = conditionElement.text().trim() || 'Unknown';

  // Extract size (e.g., "Taille unique")
  const sizeElement = $('[data-testid="item-attributes-size"] .web_ui__Text__bold');
  const size = sizeElement.text().trim() || 'N/A';

  // Extract favorites count (not directly available on product page, set to 0)
  const favoritesCount = 0; // Vinted doesn't display favorites on product pages

  // Extract image URL
  const imageElement = $('.item-photos img'); // Adjust selector based on actual image location
  const imageUrl = imageElement.attr('src') || '';

  // Extract posted time (e.g., "Il y a 19 heures")
  const postedTimeElement = $('[data-testid="item-attributes-upload_date"] .web_ui__Text__bold');
  const postedTime = postedTimeElement.text().trim() || 'Unknown';

  // Extract seller (e.g., "keratos")
  const sellerElement = $('[data-testid="profile-username"]');
  const seller = sellerElement.text().trim() || 'Unknown';

  // Extract description
  const descriptionElement = $('[itemprop="description"] .web_ui__Text__body');
  const description = descriptionElement.text().trim() || '';

  // Extract shipping cost (e.g., "à partir de 2,88 €")
  const shippingElement = $('[data-testid="item-shipping-banner-price"]');
  const shippingCost = shippingElement.text().trim() || 'Unknown';

  // Extract view count (e.g., "14")
  const viewCountElement = $('[data-testid="item-attributes-view_count"] .web_ui__Text__bold');
  const viewCount = viewCountElement.text().trim() ? parseInt(viewCountElement.text().trim()) : 0;

  // Filter for Lego items
  if (title.toLowerCase().includes('lego') || description.toLowerCase().includes('lego')) {
    return [{
      title,
      price,
      totalPrice,
      link: url,
      brand,
      condition,
      size,
      favoritesCount,
      imageUrl,
      postedTime,
      seller,
      description,
      shippingCost,
      viewCount,
    }];
  }

  return [];
};

/**
 * Scrape sales from vinted.fr with retry mechanism
 * @param {String} url - URL to scrape
 * @returns {Array} Array of sale objects
 */
module.exports.scrape = async (url) => {
  const maxRetries = 3;
  let attempt = 0;

  // Determine if it's a product page (URL contains "/items/")
  const isProductPage = url.includes('/items/');

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

      // Mimic a real browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

      // Set viewport to mimic a real browser
      await page.setViewport({ width: 1366, height: 768 });

      // Bypass some common bot detections
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
      });

      // Load the page with increased timeout
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

      // Add a delay to allow dynamic content to load
      await delay(5000);

      let body;
      let sales = [];

      if (isProductPage) {
        // Wait for the product page content
        await page.waitForSelector('.item-page-sidebar-content, .details-list', { timeout: 30000 });

        body = await page.content();
        sales = parseProductPage(body, url);
      } else {
        // Wait for the search/list page content
        await page.waitForSelector('.new-item-box__container', { timeout: 90000 });

        body = await page.content();
        sales = parseSearchResults(body);
      }

      await browser.close();

      // Save results to lego/server/data
      const dataDir = path.resolve(__dirname, '../../../data');
      await fs.mkdir(dataDir, { recursive: true });
      const filePath = path.join(dataDir, 'sales_vinted.json');
      await fs.writeFile(filePath, JSON.stringify(sales, null, 2));

      return sales;
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