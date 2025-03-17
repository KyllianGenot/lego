const fs = require('fs').promises;
const path = require('path');
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
 * Updates Dealabs and Vinted data files, then uses the updated files for analysis
 * @param {string} input - URL from Dealabs or a LEGO set name
 * @returns {Object} Profitability analysis results
 */
async function analyzeProfitability(input) {
  let setId = '';
  const dataDir = path.resolve(__dirname, '../../data');

  // Step 1: Process input and scrape Dealabs
  if (input.startsWith('http')) {
    if (input.includes('dealabs.com')) {
      // It's a dealabs URL
      await startSpinner(`📥 Scraping Dealabs from link "${input}"`);
      await safeScrape(dealabs.scrape, input, 'dealabs.com');
      
      // Extract set ID from scraped data
      try {
        const dealabsData = await fs.readFile(`${dataDir}/deals_dealabs.json`, 'utf8');
        const deals = JSON.parse(dealabsData);
        const deal = deals.find(d => d.link === input);
        if (deal && deal.setNumber) {
          setId = deal.setNumber;
          updateSpinnerText(`✅ Found set ID: ${setId}`);
        } else {
          // Try to extract from URL as fallback
          const setIdMatch = input.match(/(\d{4,5})/);
          setId = setIdMatch ? setIdMatch[0] : '';
          if (setId) {
            updateSpinnerText(`⚠️ Extracted potential set ID from URL: ${setId}`);
          }
        }
      } catch (err) {
        stopSpinner();
        console.log('❌ Could not extract set ID from Dealabs data:', err.message);
        return null;
      }
    } else {
      console.log('❌ Unsupported URL. Please provide a dealabs.com URL or LEGO set ID');
      return null;
    }
  } else {
    // Input is a set ID, start with Dealabs scraping
    setId = input;
    await startSpinner(`📥 Scraping Dealabs for set "${setId}"`);
    await safeScrape(
      dealabs.scrape,
      `https://www.dealabs.com/search?q=${encodeURIComponent(setId)}`,
      'dealabs.com'
    );
  }

  if (!setId) {
    stopSpinner();
    console.log('❌ Could not determine set ID');
    return null;
  }

  // Step 2: Scrape Vinted with the identified set ID
  updateSpinnerText(`🌐 Scraping Vinted for set "${setId}"`);
  const vintedUrl = `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(setId)}`;
  await safeScrape(vinted.scrape, vintedUrl, 'vinted.fr');

  // Step 3: Load updated data from files
  let dealabsDeals = [];
  let vintedDeals = [];

  try {
    const dealabsData = await fs.readFile(`${dataDir}/deals_dealabs.json`, 'utf8');
    dealabsDeals = JSON.parse(dealabsData);
  } catch (err) {
    stopSpinner();
    console.log('❌ Failed to load updated Dealabs data:', err.message);
    return null;
  }

  try {
    const vintedData = await fs.readFile(`${dataDir}/sales_vinted.json`, 'utf8');
    vintedDeals = JSON.parse(vintedData);
  } catch (err) {
    stopSpinner();
    console.log('❌ Failed to load updated Vinted data:', err.message);
    return null;
  }

  // Step 4: Filter and select source deal from Dealabs data
  let sourceDeal = null;
  const allSourceDeals = dealabsDeals
    .filter(deal => deal.setNumber === setId)
    .map(deal => ({ ...deal, source: 'dealabs.com' }));

  if (allSourceDeals.length > 0) {
    sourceDeal = allSourceDeals
      .filter(deal => deal.price !== null && deal.price !== undefined)
      .sort((a, b) => a.price - b.price)[0]; // Take the cheapest deal
  }

  if (!sourceDeal) {
    stopSpinner();
    console.log(`❌ No valid deals found for set ID "${setId}" in Dealabs data`);
    return null;
  }

  stopSpinner();
  console.log(`✅ Found deal: ${sourceDeal.title} at ${sourceDeal.price}€`);

  // Step 5: Filter Vinted deals
  await startSpinner(`🌐 Filtering Vinted listings for set "${setId}"`);
  const relevantResults = vintedDeals.filter(deal =>
    deal.setNumber === setId && isRelevantListing(deal.title, setId)
  );

  stopSpinner();

  // Step 6: Perform profitability analysis
  const analysis = calculateProfitability(sourceDeal, relevantResults);

  // Step 7: Save analysis
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