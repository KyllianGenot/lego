/* eslint-disable no-console, no-process-exit */
const dealabs = require('./src/scrapers/websites/dealabs');
const vinted = require('./src/scrapers/websites/vinted');
const avenuedelabrique = require('./src/scrapers/websites/avenuedelabrique');
const { startSpinner, updateSpinnerText, stopSpinner } = require('./src/utils/spinner'); // Import spinner functions

/**
 * Determines the appropriate scraper based on the URL
 * @param {string} url - The URL to scrape
 * @returns {Object} The scraper module for the corresponding website
 */
function getScraperForUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a valid string');
  }

  if (url.includes('dealabs.com')) {
    return dealabs;
  } else if (url.includes('vinted.fr')) {
    return vinted;
  } else if (url.includes('avenuedelabrique.com')) {
    return avenuedelabrique;
  } else {
    throw new Error('Unsupported website. Please provide a URL from dealabs.com, vinted.fr, or avenuedelabrique.com');
  }
}

/**
 * Scrapes information from the provided URL and displays the results
 * @param {string} website - The URL to scrape
 */
async function sandbox(website) {
  try {
    if (!website) {
      throw new Error('Please provide a URL to scrape');
    }

    await startSpinner(`🌐 Browsing ${website}`);

    const scraper = getScraperForUrl(website);
    const deals = await scraper.scrape(website);

    stopSpinner();
    if (deals.length === 0) {
      console.log('No deals found at the provided URL.');
    } else {
      console.log('Scraped Information:');
      console.log(JSON.stringify(deals, null, 2)); // Pretty-print the scraped data
    }

    console.log('Done ✅');
    process.exit(0);
  } catch (e) {
    stopSpinner();
    console.error('Error:', e.message);
    process.exit(1);
  }
}

const [,, url] = process.argv;

sandbox(url);