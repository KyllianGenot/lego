const fs = require('fs').promises;
const path = require('path');
const { MongoClient } = require('mongodb');
const { startSpinner, updateSpinnerText, stopSpinner, log } = require('../utils/spinner');
const { safeScrape } = require('../scrapers/scraperUtils');
const dealabs = require('../scrapers/websites/dealabs');
const vinted = require('../scrapers/websites/vinted');
const { cleanSetName } = require('../analysis/cleaners');
const { isRelevantListing } = require('../analysis/filters');
const { calculateProfitability } = require('../analysis/calculators');
const { displayProfitabilitySummary } = require('../analysis/display');
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
    client = await MongoClient.connect(MONGODB_URI, { useUnifiedTopology: true });
    const db = client.db(MONGODB_DB_NAME);
    const dealsCollection = db.collection('deals');
    const salesCollection = db.collection('sales');
    const analyzesCollection = db.collection('analyzes'); // Collection for analysis results

    // Create unique indexes to prevent duplicates
    await dealsCollection.createIndex({ link: 1 }, { unique: true });
    await salesCollection.createIndex({ link: 1 }, { unique: true });
    await analyzesCollection.createIndex({ setNumber: 1 }, { unique: true });

    // Step 1: Process input and scrape Dealabs
    let dealabsDeals = [];
    if (input.startsWith('http')) {
      if (input.includes('dealabs.com')) {
        await startSpinner(`Scraping Dealabs from link "${input}"`);
        try {
          dealabsDeals = await dealabs.scrape(input);
          updateSpinnerText(`Scraped ${dealabsDeals.length} deals from Dealabs`);

          const deal = dealabsDeals.find(d => d.link === input);
          if (deal && deal.setNumber) {
            setId = deal.setNumber;
            updateSpinnerText(`Found set ID: ${setId}`);
          } else {
            const setIdMatch = input.match(/(\d{4,5})/);
            setId = setIdMatch ? setIdMatch[0] : '';
            if (setId) updateSpinnerText(`Extracted potential set ID from URL: ${setId}`);
          }

          if (dealabsDeals && dealabsDeals.length > 0) {
            for (const deal of dealabsDeals) {
              await dealsCollection.updateOne(
                { link: deal.link },
                { $set: deal },
                { upsert: true }
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
      setId = input;
      await startSpinner(`Scraping Dealabs for set "${setId}"`);
      try {
        dealabsDeals = await dealabs.scrape(`https://www.dealabs.com/search?q=${encodeURIComponent(setId)}`);
        updateSpinnerText(`Scraped ${dealabsDeals.length} deals from Dealabs`);

        if (dealabsDeals && dealabsDeals.length > 0) {
          for (const deal of dealabsDeals) {
            await dealsCollection.updateOne(
              { link: deal.link },
              { $set: deal },
              { upsert: true }
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

    // Step 2: Scrape Vinted
    updateSpinnerText(`Scraping Vinted for set "${setId}"`);
    let vintedDeals = [];
    try {
      const vintedUrl = `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(setId)}`;
      vintedDeals = await vinted.scrape(vintedUrl);
      updateSpinnerText(`Scraped ${vintedDeals.length} listings from Vinted`);

      if (vintedDeals && vintedDeals.length > 0) {
        for (const listing of vintedDeals) {
          await salesCollection.updateOne(
            { link: listing.link },
            { $set: listing },
            { upsert: true }
          );
        }
        updateSpinnerText(`Updated ${vintedDeals.length} listings in database`);
      }
    } catch (scrapeError) {
      updateSpinnerText(`Error scraping Vinted: ${scrapeError.message}`);
    }

    // Step 3: Load data from MongoDB
    const allDealabsDeals = await dealsCollection.find({ setNumber: setId }).toArray();
    const allVintedDeals = await salesCollection.find({ setNumber: setId }).toArray();

    // Step 4: Select source deal
    let sourceDeal = null;
    const allSourceDeals = allDealabsDeals.map(deal => ({ ...deal, source: 'dealabs.com' }));
    if (allSourceDeals.length > 0) {
      sourceDeal = allSourceDeals
        .filter(deal => deal.price !== null && deal.price !== undefined)
        .sort((a, b) => a.price - b.price)[0];
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
      const result = await analyzesCollection.updateOne(
        { setNumber: analysis.sourceDeal.setNumber },
        { $set: { ...analysis, updatedAt: new Date() } },
        { upsert: true }
      );
      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        log(`✅ Analysis saved for set ${analysis.sourceDeal.setNumber} in MongoDB`);
      } else {
        log(`⚠️ Analysis for set ${analysis.sourceDeal.setNumber} was not saved - no changes detected`);
      }

      // Verify the collection exists and contains the data
      const savedAnalysis = await analyzesCollection.findOne({ setNumber: analysis.sourceDeal.setNumber });
      if (savedAnalysis) {
        log(`✅ Verified: Analysis for set ${setId} exists in 'analyzes' collection`);
      } else {
        log(`❌ Error: Analysis for set ${setId} not found in 'analyzes' collection after save`);
      }
    } else {
      log('⚠️ Could not save analysis to MongoDB: Missing set number or invalid analysis');
    }

    // Step 8: Save analysis to file (optional)
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(`${dataDir}/profitability_analysis.json`, JSON.stringify(analysis, null, 2));
      log(`✅ Analysis saved to file: ${dataDir}/profitability_analysis.json`);
    } catch (error) {
      log(`⚠️ Warning: Could not save analysis to file: ${error.message}`);
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