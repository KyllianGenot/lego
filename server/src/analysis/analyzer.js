const fs = require('fs').promises;
const path = require('path');
const { MongoClient } = require('mongodb');
const { startSpinner, updateSpinnerText, stopSpinner, log } = require('../utils/spinner');
const { safeScrape } = require('../scrapers/scraperUtils');
const dealabs = require('../scrapers/websites/dealabs');
const vinted = require('../scrapers/websites/vinted');
const { cleanSetName } = require('./cleaners');
const { isRelevantListing } = require('./filters');
const { calculateProfitability } = require('./calculators');
const { displayProfitabilitySummary } = require('./display');
require('dotenv').config(); // Load environment variables

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

/**
 * Analyzes the profitability of a LEGO set by comparing source price with Vinted selling prices
 * Stores scraped data in MongoDB and uses MongoDB for analysis
 * @param {string} input - URL from Dealabs or a LEGO set name
 * @returns {Object} Profitability analysis results
 */
async function analyzeProfitability(input) {
  let client;
  let setId = '';
  const dataDir = path.resolve(__dirname, '../../data');

  try {
    // Connect to MongoDB
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_DB_NAME);
    const dealsCollection = db.collection('deals');
    const salesCollection = db.collection('sales');
    const analyzesCollection = db.collection('analyzes'); // New collection for analysis results

    // Create unique indexes to prevent duplicates
    await dealsCollection.createIndex({ link: 1 }, { unique: true });
    await salesCollection.createIndex({ link: 1 }, { unique: true });
    await analyzesCollection.createIndex({ setNumber: 1 }, { unique: true }); // Unique index on setNumber

    // Step 1: Process input and scrape Dealabs
    let dealabsDeals = [];
    if (input.startsWith('http')) {
      if (input.includes('dealabs.com')) {
        // It's a Dealabs URL
        await startSpinner(`Scraping Dealabs from link "${input}"`);
        
        try {
          dealabsDeals = await dealabs.scrape(input);
          updateSpinnerText(`Scraped ${dealabsDeals.length} deals from Dealabs`);
          
          // Extract set ID from scraped data
          const deal = dealabsDeals.find(d => d.link === input);
          if (deal && deal.setNumber) {
            setId = deal.setNumber;
            updateSpinnerText(`Found set ID: ${setId}`);
          } else {
            // Try to extract from URL as fallback
            const setIdMatch = input.match(/(\d{4,5})/);
            setId = setIdMatch ? setIdMatch[0] : '';
            if (setId) {
              updateSpinnerText(`Extracted potential set ID from URL: ${setId}`);
            }
          }
          
          // Update or insert scraped Dealabs data into MongoDB
          if (dealabsDeals && dealabsDeals.length > 0) {
            for (const deal of dealabsDeals) {
              await dealsCollection.updateOne(
                { link: deal.link },       // Filter by unique link
                { $set: deal },            // Replace with latest data
                { upsert: true }           // Insert if not found
              );
            }
            updateSpinnerText(`Updated ${dealabsDeals.length} deals in database`);
          }
        } catch (scrapeError) {
          updateSpinnerText(`Error scraping Dealabs: ${scrapeError.message}`);
        }
      } else {
        await stopSpinner();
        log('❌ Unsupported URL. Please provide a dealabs.com URL or LEGO set ID');
        return null;
      }
    } else {
      // Input is a set ID
      setId = input;
      await startSpinner(`Scraping Dealabs for set "${setId}"`);
      
      try {
        dealabsDeals = await dealabs.scrape(`https://www.dealabs.com/search?q=${encodeURIComponent(setId)}`);
        updateSpinnerText(`Scraped ${dealabsDeals.length} deals from Dealabs`);
        
        // Update or insert scraped Dealabs data into MongoDB
        if (dealabsDeals && dealabsDeals.length > 0) {
          for (const deal of dealabsDeals) {
            await dealsCollection.updateOne(
              { link: deal.link },       // Filter by unique link
              { $set: deal },            // Replace with latest data
              { upsert: true }           // Insert if not found
            );
          }
          updateSpinnerText(`Updated ${dealabsDeals.length} deals in database`);
        }
      } catch (scrapeError) {
        updateSpinnerText(`Error scraping Dealabs: ${scrapeError.message}`);
      }
    }

    if (!setId) {
      await stopSpinner();
      log('❌ Could not determine set ID');
      return null;
    }

    // Step 2: Scrape Vinted with the identified set ID
    updateSpinnerText(`Scraping Vinted for set "${setId}"`);
    
    let vintedDeals = [];
    try {
      const vintedUrl = `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(setId)}`;
      vintedDeals = await vinted.scrape(vintedUrl);
      updateSpinnerText(`Scraped ${vintedDeals.length} listings from Vinted`);
      
      // Update or insert scraped Vinted data into MongoDB
      if (vintedDeals && vintedDeals.length > 0) {
        for (const listing of vintedDeals) {
          await salesCollection.updateOne(
            { link: listing.link },     // Filter by unique link
            { $set: listing },          // Replace with latest data
            { upsert: true }            // Insert if not found
          );
        }
        updateSpinnerText(`Updated ${vintedDeals.length} listings in database`);
      }
    } catch (scrapeError) {
      updateSpinnerText(`Error scraping Vinted: ${scrapeError.message}`);
    }

    // Step 3: Load updated data from MongoDB
    const allDealabsDeals = await dealsCollection.find({ setNumber: setId }).toArray();
    const allVintedDeals = await salesCollection.find({ setNumber: setId }).toArray();

    // Step 4: Filter and select source deal from Dealabs data
    let sourceDeal = null;
    const allSourceDeals = allDealabsDeals
      .map(deal => ({ ...deal, source: 'dealabs.com' }));

    if (allSourceDeals.length > 0) {
      sourceDeal = allSourceDeals
        .filter(deal => deal.price !== null && deal.price !== undefined)
        .sort((a, b) => a.price - b.price)[0]; // Take the cheapest deal
    }

    if (!sourceDeal) {
      await stopSpinner();
      log(`❌ No valid deals found for set ID "${setId}" in Dealabs data`);
      return null;
    }

    await stopSpinner();
    log(`✅ Found deal: ${sourceDeal.title} at ${sourceDeal.price}€`);

    // Step 5: Filter Vinted deals
    await startSpinner(`Filtering Vinted listings for set "${setId}"`);
    const relevantResults = allVintedDeals.filter(deal =>
      deal.setNumber === setId && isRelevantListing(deal.title, setId)
    );

    await stopSpinner();

    // Step 6: Perform profitability analysis
    const analysis = calculateProfitability(sourceDeal, relevantResults);

    // Step 7: Save analysis to MongoDB 'analyzes' collection
    if (analysis && analysis.sourceDeal && analysis.sourceDeal.setNumber) {
      await analyzesCollection.updateOne(
        { setNumber: analysis.sourceDeal.setNumber }, // Unique key based on setNumber
        { $set: analysis },                          // Update with new data
        { upsert: true }                             // Insert if not found
      );
      log(`✅ Analysis saved for set ${analysis.sourceDeal.setNumber} in MongoDB`);
    } else {
      log('⚠️ Could not save analysis to MongoDB: Missing set number');
    }

    // Step 8: Save analysis to file (optional, keeping this as is)
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(`${dataDir}/profitability_analysis.json`, JSON.stringify(analysis, null, 2));
    } catch (error) {
      log(`\n⚠️ Warning: Could not save analysis to file: ${error.message}`);
    }

    log('✅ Analysis complete');
    displayProfitabilitySummary(analysis);

    return analysis;
  } catch (error) {
    await stopSpinner();
    console.error('Error during analysis:', error);
    return null;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

module.exports = { analyzeProfitability };