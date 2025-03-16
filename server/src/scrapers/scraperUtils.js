/**
 * Safe scraping with error handling
 * @param {Function} scraperFn - Scraper function to call
 * @param {string} url - URL to scrape
 * @param {string} sourceName - Name of the source for logging
 * @returns {Array} Scraped deals or empty array on error
 */
async function safeScrape(scraperFn, url, sourceName) {
  try {
    return await scraperFn(url);
  } catch (error) {
    console.log(`\n⚠️  Warning: Error scraping ${sourceName} at ${url}: ${error.message}`);
    return [];
  }
}

module.exports = { safeScrape };