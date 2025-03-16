const fs = require('fs').promises;
const path = require('path'); // Add path module for resolving directories
const { startSpinner, updateSpinnerText, stopSpinner } = require('../utils/spinner');
const { safeScrape } = require('../scrapers/scraperUtils');
const dealabs = require('../scrapers/websites/dealabs');
const vinted = require('../scrapers/websites/vinted');
const { cleanSetName } = require('./cleaners');
const { isRelevantListing } = require('./filters');
const { calculateProfitability } = require('./calculators');
const { displayProfitabilitySummary } = require('./display');

/**
 * Analyzes the profitability of a LEGO set by comparing source price with Vinted selling prices
 * @param {string} input - URL from dealabs or a LEGO set name
 * @returns {Object} Profitability analysis results
 */
async function analyzeProfitability(input) {
  await startSpinner('📥 Retrieving deal information from Dealabs');

  let sourceDeal = null;
  let setId = '';

  if (input.startsWith('http')) {
    if (input.includes('dealabs.com')) {
      const deals = await safeScrape(dealabs.scrape, input, 'dealabs.com');
      if (deals.length > 0) {
        sourceDeal = { ...deals[0], source: 'dealabs.com' };
        const setIdMatch = sourceDeal.title.match(/(\d{4,5})/);
        setId = setIdMatch ? setIdMatch[0] : '';
      }
    } else {
      stopSpinner();
      console.log('❌ Unsupported URL. Please provide a dealabs.com URL or LEGO set ID');
      return null;
    }

    if (!sourceDeal) {
      stopSpinner();
      console.log('❌ Could not extract deal information from the provided URL');
      return null;
    }
  } else {
    setId = input;
    updateSpinnerText(`📥 Searching for "${setId}" on Dealabs`);

    const dealabsResults = await safeScrape(
      dealabs.scrape,
      `https://www.dealabs.com/search?q=${encodeURIComponent(setId)}`,
      'dealabs.com'
    );

    const allSourceDeals = dealabsResults.map(deal => ({ ...deal, source: 'dealabs.com' }));

    if (allSourceDeals.length > 0) {
      sourceDeal = allSourceDeals
        .filter(deal => deal.price !== null && deal.price !== undefined)
        .sort((a, b) => a.price - b.price)[0]; // Take the cheapest deal
    }

    if (!sourceDeal) {
      stopSpinner();
      console.log('❌ No valid deals found for set ID "${setId}" on Dealabs');
      return null; // Exit if no deal is found
    }
  }

  stopSpinner();
  console.log(`✅ Found deal: ${sourceDeal.title} at ${sourceDeal.price}€`);

  await startSpinner(`🌐 Searching for listings on Vinted for set "${setId}"`);
  const vintedUrl = `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(setId)}`;
  const vintedDeals = await safeScrape(vinted.scrape, vintedUrl, 'vinted.fr');
  stopSpinner();

  // Ensure vintedDeals is an array before filtering
  if (!Array.isArray(vintedDeals)) {
    console.log('❌ Invalid Vinted data received, proceeding with empty results');
    vintedDeals = [];
  }

  const relevantResults = vintedDeals.filter(deal =>
    isRelevantListing(deal.title, setId)
  );

  const analysis = calculateProfitability(sourceDeal, relevantResults);

  const dataDir = path.resolve(__dirname, '../../data'); // Updated to resolve to lego/server/data
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.log(`⚠️ Warning: Could not create data directory: ${err.message}`);
    }
  }

  try {
    await fs.writeFile(`${dataDir}/profitability_analysis.json`, JSON.stringify(analysis, null, 2));
  } catch (error) {
    console.log(`\n⚠️ Warning: Could not save analysis to file: ${error.message}`);
  }

  console.log('✅ Analysis complete');
  displayProfitabilitySummary(analysis);

  return analysis;
}

module.exports = { analyzeProfitability };