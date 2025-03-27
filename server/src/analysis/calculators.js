const fs = require('fs').promises;
const path = require('path');

function calculateProfitability(sourceDeal, vintedDeals) {
  // Initialize base values
  const sourcePrice = sourceDeal ? sourceDeal.price : null;
  const sourceTemperature = sourceDeal ? sourceDeal.temperature : 0;
  const sourceComments = sourceDeal ? sourceDeal.commentsCount : 0;
  const freeShipping = sourceDeal ? sourceDeal.freeShipping : false;
  const sourcePriceWithShipping = freeShipping ? sourcePrice : sourcePrice + 4.99;

  // Filter deals: only consider condition 1 and 2, and with valid prices
  const filteredDeals = vintedDeals.filter(deal =>
    (deal.condition === 1 || deal.condition === 2) &&
    deal.price !== null &&
    deal.price !== undefined
  );

  const vintedPrices = filteredDeals.map(deal => deal.price).sort((a, b) => a - b);

  // Base result object for when data is insufficient
  const baseResult = {
    sourceDeal,
    vintedListingsCount: vintedDeals.length,
    newConditionListingsCount: filteredDeals.length,
    averageSellingPrice: null,
    medianSellingPrice: null,
    lowerQuartilePrice: null,
    upperQuartilePrice: null,
    purchasePriceWithShipping: sourcePriceWithShipping,
    potentialProfit: null,
    profitPercentage: null,
    estimatedNetProfit: null,
    profitabilityRating: 'Unknown (No data)',
    dealScore: 0,
    scoreBreakdown: {
      percentileScore: 0,
      profitScore: 0,
      marketScore: 0,
      dealQualityScore: 0,
      liquidityScore: 0,
      riskScore: 0
    },
    recommendation: 'Cannot evaluate due to insufficient data',
    timestamp: new Date().toISOString()
  };

  if (!sourcePrice || filteredDeals.length === 0) {
    return baseResult;
  }

  // Calculate basic statistics
  const avgSellingPrice = filteredDeals.reduce((sum, deal) => sum + deal.price, 0) / filteredDeals.length;
  const medianPrice = vintedPrices[Math.floor(vintedPrices.length / 2)];
  const lowerQuartileIndex = Math.floor(vintedPrices.length * 0.25);
  const upperQuartileIndex = Math.floor(vintedPrices.length * 0.75);
  const lowerQuartilePrice = vintedPrices[lowerQuartileIndex] || vintedPrices[0];
  const upperQuartilePrice = vintedPrices[upperQuartileIndex] || vintedPrices[vintedPrices.length - 1];

  // Calculate percentile rank of Dealabs price
  const sourcePricePercentile = calculatePercentile(vintedPrices, sourcePrice);

  // Calculate price variance for market stability
  const priceVariance = filteredDeals.reduce((sum, deal) => sum + Math.pow(deal.price - avgSellingPrice, 2), 0) / filteredDeals.length;
  const priceStandardDeviation = Math.sqrt(priceVariance);
  const coefficientOfVariation = (priceStandardDeviation / avgSellingPrice) * 100;

  // Calculate fees and net profit (sellerShippingCost removed)
  const vintedFeePercentage = 5;
  const vintedFixedFee = 0.70;
  const sellerEarnings = avgSellingPrice * (1 - vintedFeePercentage / 100) - vintedFixedFee;
  const estimatedNetProfit = sellerEarnings - sourcePriceWithShipping;

  // Calculate profit metrics
  const potentialProfit = estimatedNetProfit;
  const profitPercentage = (potentialProfit / sourcePriceWithShipping) * 100;

  // Calculate average condition and favorites
  const avgCondition = filteredDeals.reduce((sum, deal) => sum + deal.condition, 0) / filteredDeals.length;
  const avgFavorites = filteredDeals.reduce((sum, deal) => sum + (deal.favoritesCount || 0), 0) / filteredDeals.length;

  // Calculate time-based metrics
  const now = new Date();
  const sourceDealAge = sourceDeal.postedDate ?
    Math.round((now - new Date(sourceDeal.postedDate)) / (1000 * 60 * 60 * 24)) :
    0;
  let adjustedTemperature = sourceTemperature;
  if (sourceDealAge > 0) {
    adjustedTemperature = sourceTemperature / (1 + (sourceDealAge / 7));
  }

  // ### Scoring System (Total: 100 Points) ###

  // 1. Percentile Score (0-15 points)
  let percentileScore = 0;
  if (sourcePricePercentile <= 5) percentileScore = 15;
  else if (sourcePricePercentile <= 10) percentileScore = 12;
  else if (sourcePricePercentile <= 20) percentileScore = 9;
  else if (sourcePricePercentile <= 30) percentileScore = 6;
  else if (sourcePricePercentile <= 40) percentileScore = 3;
  else percentileScore = 0;

  // 2. Profit Score (0-25 points)
  let profitScore = 0;
  // Net profit (0-15 points)
  if (estimatedNetProfit >= 30) profitScore += 15;
  else if (estimatedNetProfit >= 20) profitScore += 12;
  else if (estimatedNetProfit >= 10) profitScore += 8;
  else if (estimatedNetProfit >= 5) profitScore += 4;
  else if (estimatedNetProfit > 0) profitScore += 2;
  else profitScore += 0;
  // ROI (0-10 points)
  if (profitPercentage >= 100) profitScore += 10;
  else if (profitPercentage >= 50) profitScore += 8;
  else if (profitPercentage >= 30) profitScore += 6;
  else if (profitPercentage >= 20) profitScore += 4;
  else if (profitPercentage >= 10) profitScore += 2;
  else profitScore += 0;

  // 3. Market Score (0-20 points)
  let marketScore = 0;
  // Number of listings (0-8 points)
  if (filteredDeals.length >= 15) marketScore += 8;
  else if (filteredDeals.length >= 10) marketScore += 6;
  else if (filteredDeals.length >= 5) marketScore += 4;
  else if (filteredDeals.length >= 3) marketScore += 2;
  else marketScore += 1;
  // Price stability (0-8 points)
  if (coefficientOfVariation <= 10) marketScore += 8;
  else if (coefficientOfVariation <= 15) marketScore += 6;
  else if (coefficientOfVariation <= 20) marketScore += 4;
  else if (coefficientOfVariation <= 30) marketScore += 2;
  else if (coefficientOfVariation <= 40) marketScore += 1;
  // Price trend (0-4 points)
  const upperToAvgRatio = upperQuartilePrice / avgSellingPrice;
  if (upperToAvgRatio >= 1.3) marketScore += 4;
  else if (upperToAvgRatio >= 1.2) marketScore += 3;
  else if (upperToAvgRatio >= 1.1) marketScore += 2;
  else if (upperToAvgRatio >= 1.05) marketScore += 1;
  else marketScore += 0;

  // 4. Deal Quality Score (0-15 points)
  let dealQualityScore = 0;
  // Deal temperature (0-7 points)
  if (adjustedTemperature >= 500) dealQualityScore += 7;
  else if (adjustedTemperature >= 300) dealQualityScore += 5;
  else if (adjustedTemperature >= 200) dealQualityScore += 4;
  else if (adjustedTemperature >= 100) dealQualityScore += 3;
  else if (adjustedTemperature >= 50) dealQualityScore += 2;
  else dealQualityScore += 0;
  // Comments count (0-4 points)
  if (sourceComments >= 20) dealQualityScore += 4;
  else if (sourceComments >= 10) dealQualityScore += 3;
  else if (sourceComments >= 5) dealQualityScore += 2;
  else if (sourceComments >= 2) dealQualityScore += 1;
  else dealQualityScore += 0;
  // Deal freshness (0-4 points)
  if (sourceDealAge <= 1) dealQualityScore += 4;
  else if (sourceDealAge <= 2) dealQualityScore += 3;
  else if (sourceDealAge <= 7) dealQualityScore += 2;
  else if (sourceDealAge <= 14) dealQualityScore += 1;
  else dealQualityScore += 0;

  // 5. Liquidity Score (0-15 points)
  let liquidityScore = 0;
  // Average favorites (0-8 points)
  if (avgFavorites >= 15) liquidityScore += 8;
  else if (avgFavorites >= 10) liquidityScore += 6;
  else if (avgFavorites >= 5) liquidityScore += 4;
  else if (avgFavorites >= 2) liquidityScore += 2;
  else liquidityScore += 1;
  // Condition score (0-7 points)
  if (avgCondition <= 1.2) liquidityScore += 7;
  else if (avgCondition <= 1.5) liquidityScore += 6;
  else if (avgCondition <= 1.8) liquidityScore += 5;
  else liquidityScore += 4;

  // 6. Risk Score (0-10 points)
  let riskScore = 0;
  // Price-to-minimum ratio (0-5 points)
  const minPrice = vintedPrices[0];
  const priceToMinRatio = avgSellingPrice / minPrice;
  if (priceToMinRatio >= 1.5) riskScore += 5;
  else if (priceToMinRatio >= 1.3) riskScore += 4;
  else if (priceToMinRatio >= 1.2) riskScore += 3;
  else if (priceToMinRatio >= 1.1) riskScore += 2;
  else riskScore += 1;
  // Investment size (0-5 points)
  if (sourcePriceWithShipping <= 20) riskScore += 5;
  else if (sourcePriceWithShipping <= 50) riskScore += 4;
  else if (sourcePriceWithShipping <= 100) riskScore += 3;
  else if (sourcePriceWithShipping <= 200) riskScore += 2;
  else riskScore += 1;

  // Calculate total score
  const totalScore = percentileScore + profitScore + marketScore + dealQualityScore + liquidityScore + riskScore;

  // Determine profitability rating
  let profitabilityRating = 'Unknown';
  if (profitPercentage !== null) {
    if (estimatedNetProfit <= 0) profitabilityRating = 'Not Profitable';
    else if (profitPercentage > 30) profitabilityRating = 'Excellent';
    else if (profitPercentage > 20) profitabilityRating = 'Good';
    else if (profitPercentage > 10) profitabilityRating = 'Fair';
    else if (profitPercentage > 0) profitabilityRating = 'Low';
    else profitabilityRating = 'Not Profitable';
  }

  // Generate recommendation (Updated Labels)
  let recommendation = '';
  if (estimatedNetProfit <= 0) recommendation = 'Avoid - Not Profitable';
  else if (totalScore >= 80) recommendation = 'Strongly Buy - Excellent Opportunity';
  else if (totalScore >= 70) recommendation = 'Buy - Great Opportunity';
  else if (totalScore >= 60) recommendation = 'Consider Buying - Good Potential';
  else if (totalScore >= 50) recommendation = 'Watch - Moderate Potential';
  else if (totalScore >= 40) recommendation = 'Proceed with Caution - Marginal Opportunity';
  else recommendation = 'Avoid - Low Profitability or High Risk';

  return {
    sourceDeal,
    vintedListingsCount: vintedDeals.length,
    newConditionListingsCount: filteredDeals.length,
    averageSellingPrice: parseFloat(avgSellingPrice.toFixed(2)),
    medianSellingPrice: parseFloat(medianPrice.toFixed(2)),
    lowerQuartilePrice: parseFloat(lowerQuartilePrice.toFixed(2)),
    upperQuartilePrice: parseFloat(upperQuartilePrice.toFixed(2)),
    purchasePrice: sourcePrice,
    purchasePriceWithShipping: parseFloat(sourcePriceWithShipping.toFixed(2)),
    potentialProfit: parseFloat(potentialProfit.toFixed(2)),
    profitPercentage: parseFloat(profitPercentage.toFixed(2)),
    estimatedNetProfit: parseFloat(estimatedNetProfit.toFixed(2)),
    priceStandardDeviation: parseFloat(priceStandardDeviation.toFixed(2)),
    coefficientOfVariation: parseFloat(coefficientOfVariation.toFixed(2)),
    averageCondition: parseFloat(avgCondition.toFixed(2)),
    averageFavorites: parseFloat(avgFavorites.toFixed(2)),
    sourceDealAge: sourceDealAge,
    profitabilityRating,
    dealScore: totalScore,
    scoreBreakdown: {
      percentileScore,
      profitScore,
      marketScore,
      dealQualityScore,
      liquidityScore,
      riskScore
    },
    recommendation,
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper function to calculate percentile rank
 * @param {Array} sortedPrices - Sorted array of Vinted prices
 * @param {Number} value - Source price to rank
 * @returns {Number} Percentile rank (0-100)
 */
function calculatePercentile(sortedPrices, value) {
  if (sortedPrices.length === 0) return 100;
  let count = 0;
  for (let price of sortedPrices) {
    if (price < value) count++;
  }
  return (count / sortedPrices.length) * 100;
}

/**
 * Save deal analysis results to file, with proper merging and update
 * @param {Object} dealAnalysis - Result from calculateProfitability
 * @param {String} filePath - Path to save the file
 */
async function saveAnalysisToFile(dealAnalysis, filePath) {
  try {
    // Create directory if it doesn't exist
    const fileDir = path.dirname(filePath);
    await fs.mkdir(fileDir, { recursive: true });

    // Try to read existing data
    let existingAnalyses = [];
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      existingAnalyses = JSON.parse(fileData);
      if (!Array.isArray(existingAnalyses)) {
        existingAnalyses = [];
      }
    } catch (err) {
      console.log(`Creating new analysis file at ${filePath}`);
    }

    // Use Map for efficient lookups
    const existingAnalysesMap = new Map();
    existingAnalyses.forEach(analysis => {
      if (analysis.sourceDeal?.setNumber) {
        existingAnalysesMap.set(analysis.sourceDeal.setNumber, analysis);
      }
    });

    // Update or add the new analysis
    if (dealAnalysis.sourceDeal?.setNumber) {
      const setNumber = dealAnalysis.sourceDeal.setNumber;

      if (existingAnalysesMap.has(setNumber)) {
        const existingIndex = existingAnalyses.findIndex(a =>
          a.sourceDeal?.setNumber === setNumber
        );

        if (existingIndex !== -1) {
          const oldAnalysis = existingAnalyses[existingIndex];
          existingAnalyses[existingIndex] = {
            ...dealAnalysis,
            history: oldAnalysis.history ?
              [...oldAnalysis.history, {
                timestamp: oldAnalysis.timestamp,
                dealScore: oldAnalysis.dealScore,
                profitabilityRating: oldAnalysis.profitabilityRating,
                estimatedNetProfit: oldAnalysis.estimatedNetProfit
              }] :
              [{
                timestamp: oldAnalysis.timestamp,
                dealScore: oldAnalysis.dealScore,
                profitabilityRating: oldAnalysis.profitabilityRating,
                estimatedNetProfit: oldAnalysis.estimatedNetProfit
              }]
          };
        }
      } else {
        existingAnalyses.push({
          ...dealAnalysis,
          history: []
        });
      }

      // Sort by deal score (highest first)
      existingAnalyses.sort((a, b) => b.dealScore - a.dealScore);

      // Write back to file with pretty formatting
      await fs.writeFile(filePath, JSON.stringify(existingAnalyses, null, 2));
      console.log(`✅ Analysis saved for set ${setNumber}`);
    } else {
      console.warn('⚠️ Could not save analysis: Missing set number');
    }
  } catch (error) {
    console.error(`❌ Error saving analysis to file: ${error.message}`);
  }
}

/**
 * Process a batch of deals, calculate profitability, and save results
 * @param {Array} sourceDeals - Array of deals from source (dealabs)
 * @param {Array} vintedDealsMap - Map of Vinted deals by set number
 * @param {String} outputPath - Path to save results
 */
async function processDealBatch(sourceDeals, vintedDealsMap, outputPath = './data/deal_analysis.json') {
  for (const sourceDeal of sourceDeals) {
    if (!sourceDeal.setNumber) {
      console.warn(`⚠️ Skipping deal without set number: ${sourceDeal.title}`);
      continue;
    }

    const vintedDeals = vintedDealsMap.get(sourceDeal.setNumber) || [];
    if (vintedDeals.length === 0) {
      console.warn(`⚠️ No Vinted listings found for set ${sourceDeal.setNumber}`);
    }

    const analysis = calculateProfitability(sourceDeal, vintedDeals);
    await saveAnalysisToFile(analysis, outputPath);
  }

  console.log(`✅ Processed ${sourceDeals.length} deals`);
}

module.exports = {
  calculateProfitability,
  saveAnalysisToFile,
  processDealBatch
};