const { log } = require('../utils/spinner');

/**
 * Safe scraping with error handling - simplified version
 * @param {Function} scraperFn - Scraper function to call
 * @param {string} url - URL to scrape
 * @param {string} sourceName - Name of the source for logging
 * @returns {Array} Scraped deals or empty array on error
 */
async function safeScrape(scraperFn, url, sourceName, maxRetries = 3, timeoutMs = 60000) {
  // Only attempt once to simplify the process while debugging
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`Scraping timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Race between scraper and timeout
    const result = await Promise.race([
      scraperFn(url),
      timeoutPromise
    ]);
    
    return result;
  } catch (error) {
    log(`❌ Error scraping ${sourceName}: ${error.message}`);
    return [];
  }
}

module.exports = { safeScrape };