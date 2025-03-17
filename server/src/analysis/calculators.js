/**
 * Enhanced Lego Deal Calculator
 * Provides a comprehensive 100-point scoring system to evaluate deals
 * - Only analyzes listings with condition 1-2 (new or like new)
 * - Uses price with shipping for profitability calculations
 * @param {Object} sourceDeal - Deal from source site (Dealabs)
 * @param {Array} vintedDeals - Matching deals from Vinted
 * @returns {Object} Comprehensive deal analysis with 100-point score
 */
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
  
  const sortedDeals = [...filteredDeals].sort((a, b) => a.price - b.price);
  
  // Base result object that will be returned if no valid data
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
      profitScore: 0,
      marketScore: 0,
      dealQualityScore: 0,
      riskScore: 0,
      liquidityScore: 0
    },
    recommendation: 'Cannot evaluate due to insufficient data',
    timestamp: new Date().toISOString()
  };
  
  // If no source deal price or no filtered Vinted listings, return base result
  if (!sourcePrice || filteredDeals.length === 0) {
    return baseResult;
  }
  
  // Calculate basic statistics
  const avgSellingPrice = filteredDeals.reduce((sum, deal) => sum + deal.price, 0) / filteredDeals.length;
  const medianPrice = sortedDeals[Math.floor(sortedDeals.length / 2)].price;
  const lowerQuartileIndex = Math.floor(sortedDeals.length * 0.25);
  const upperQuartileIndex = Math.floor(sortedDeals.length * 0.75);
  const lowerQuartilePrice = sortedDeals[lowerQuartileIndex]?.price || sortedDeals[0].price;
  const upperQuartilePrice = sortedDeals[upperQuartileIndex]?.price || sortedDeals[sortedDeals.length - 1].price;
  
  // Calculate price variance (to assess market stability)
  const priceVariance = filteredDeals.reduce((sum, deal) => sum + Math.pow(deal.price - avgSellingPrice, 2), 0) / filteredDeals.length;
  const priceStandardDeviation = Math.sqrt(priceVariance);
  const coefficientOfVariation = (priceStandardDeviation / avgSellingPrice) * 100;
  
  // Calculate fees and net profit
  const vintedFeePercentage = 5;
  const vintedFixedFee = 0.70;
  const sellerShippingCost = 4.99;
  
  // Calculate net profit WITH shipping costs accounted for
  const estimatedNetProfit = (avgSellingPrice * (1 - vintedFeePercentage / 100) - vintedFixedFee - sellerShippingCost) - sourcePriceWithShipping;
  
  // Calculate profit metrics
  const potentialProfit = estimatedNetProfit; // Using the net profit that includes shipping
  const profitPercentage = (potentialProfit / sourcePriceWithShipping) * 100;
  
  // Calculate average condition of filtered Vinted listings (1-2 scale)
  const avgCondition = filteredDeals.reduce((sum, deal) => sum + deal.condition, 0) / filteredDeals.length;
  
  // Calculate average favorites count for listings
  const avgFavorites = filteredDeals.reduce((sum, deal) => sum + (deal.favoritesCount || 0), 0) / filteredDeals.length;
  
  // Calculate time-based metrics
  const now = new Date();
  const sourceDealAge = sourceDeal.postedDate ? 
    Math.round((now - new Date(sourceDeal.postedDate)) / (1000 * 60 * 60 * 24)) : 
    0;
  
  // Calculate age-adjusted deal temperature (more recent deals get higher weight)
  let adjustedTemperature = sourceTemperature;
  if (sourceDealAge > 0) {
    adjustedTemperature = sourceTemperature / (1 + (sourceDealAge / 7)); // Decay by age in weeks
  }
  
  // ------ SCORING SYSTEM (100 POINTS TOTAL) ------
  
  // 1. Profit Score (0-30 points)
  let profitScore = 0;
  
  // Net profit score (0-20 points) - REVISED to be stricter about profitability
  if (estimatedNetProfit !== null) {
    if (estimatedNetProfit >= 30) profitScore += 20;
    else if (estimatedNetProfit >= 20) profitScore += 15;
    else if (estimatedNetProfit >= 10) profitScore += 10;
    else if (estimatedNetProfit >= 5) profitScore += 5;
    else if (estimatedNetProfit > 0) profitScore += 2;
    else profitScore += 0; // No points if not profitable
  }
  
  // ROI score (0-10 points)
  if (profitPercentage !== null) {
    if (profitPercentage >= 100) profitScore += 10;
    else if (profitPercentage >= 50) profitScore += 8;
    else if (profitPercentage >= 30) profitScore += 6;
    else if (profitPercentage >= 20) profitScore += 4;
    else if (profitPercentage >= 10) profitScore += 2;
    else profitScore += 0; // No points if ROI is less than 10%
  }
  
  // 2. Market Score (0-25 points)
  let marketScore = 0;
  
  // Number of listings (0-10 points) - indicating demand
  if (filteredDeals.length >= 15) marketScore += 10;
  else if (filteredDeals.length >= 10) marketScore += 8;
  else if (filteredDeals.length >= 5) marketScore += 6;
  else if (filteredDeals.length >= 3) marketScore += 4;
  else marketScore += 2;
  
  // Price stability (0-10 points) - lower variance is better
  if (coefficientOfVariation <= 10) marketScore += 10;
  else if (coefficientOfVariation <= 15) marketScore += 8;
  else if (coefficientOfVariation <= 20) marketScore += 6;
  else if (coefficientOfVariation <= 30) marketScore += 4;
  else if (coefficientOfVariation <= 40) marketScore += 2;
  
  // Price trend (0-5 points) - higher upper quartile is better
  const upperToAvgRatio = upperQuartilePrice / avgSellingPrice;
  if (upperToAvgRatio >= 1.3) marketScore += 5;
  else if (upperToAvgRatio >= 1.2) marketScore += 4;
  else if (upperToAvgRatio >= 1.1) marketScore += 3;
  else if (upperToAvgRatio >= 1.05) marketScore += 2;
  else marketScore += 1;
  
  // 3. Deal Quality Score (0-20 points)
  let dealQualityScore = 0;
  
  // Deal temperature (0-10 points)
  if (adjustedTemperature >= 500) dealQualityScore += 10;
  else if (adjustedTemperature >= 300) dealQualityScore += 8;
  else if (adjustedTemperature >= 200) dealQualityScore += 6;
  else if (adjustedTemperature >= 100) dealQualityScore += 4;
  else if (adjustedTemperature >= 50) dealQualityScore += 2;
  
  // Comments count (0-5 points)
  if (sourceComments >= 20) dealQualityScore += 5;
  else if (sourceComments >= 10) dealQualityScore += 4;
  else if (sourceComments >= 5) dealQualityScore += 3;
  else if (sourceComments >= 2) dealQualityScore += 2;
  else if (sourceComments >= 1) dealQualityScore += 1;
  
  // Source deal freshness (0-5 points)
  if (sourceDealAge <= 1) dealQualityScore += 5;
  else if (sourceDealAge <= 2) dealQualityScore += 4;
  else if (sourceDealAge <= 7) dealQualityScore += 3;
  else if (sourceDealAge <= 14) dealQualityScore += 2;
  else if (sourceDealAge <= 30) dealQualityScore += 1;
  
  // 4. Liquidity Score (0-15 points)
  let liquidityScore = 0;
  
  // Average favorites (0-8 points)
  if (avgFavorites >= 15) liquidityScore += 8;
  else if (avgFavorites >= 10) liquidityScore += 6;
  else if (avgFavorites >= 5) liquidityScore += 4;
  else if (avgFavorites >= 2) liquidityScore += 2;
  else liquidityScore += 1;
  
  // Condition score (0-7 points) - lower condition number is better
  if (avgCondition <= 1.2) liquidityScore += 7;  // Mostly new with tags
  else if (avgCondition <= 1.5) liquidityScore += 6;  // Mix of new with tags
  else if (avgCondition <= 1.8) liquidityScore += 5;  // Mostly new
  else liquidityScore += 4;  // New without tags/very good
  
  // 5. Risk Score (0-10 points)
  let riskScore = 0;
  
  // Price-to-minimum ratio (0-5 points) - higher is better
  const minPrice = sortedDeals[0].price;
  const priceToMinRatio = avgSellingPrice / minPrice;
  if (priceToMinRatio >= 1.5) riskScore += 5;
  else if (priceToMinRatio >= 1.3) riskScore += 4;
  else if (priceToMinRatio >= 1.2) riskScore += 3;
  else if (priceToMinRatio >= 1.1) riskScore += 2;
  else riskScore += 1;
  
  // Investment size (0-5 points) - lower purchase price = lower risk
  if (sourcePriceWithShipping <= 20) riskScore += 5;
  else if (sourcePriceWithShipping <= 50) riskScore += 4;
  else if (sourcePriceWithShipping <= 100) riskScore += 3;
  else if (sourcePriceWithShipping <= 200) riskScore += 2;
  else riskScore += 1;
  
  // Calculate total score
  const totalScore = profitScore + marketScore + dealQualityScore + liquidityScore + riskScore;
  
  // Determine profitability rating
  let profitabilityRating = 'Unknown';
  if (profitPercentage !== null) {
    // Only consider excellent if actual profit is positive
    if (estimatedNetProfit <= 0) {
      profitabilityRating = 'Not Profitable';
    } else if (profitPercentage > 30) {
      profitabilityRating = 'Excellent';
    } else if (profitPercentage > 20) {
      profitabilityRating = 'Good';
    } else if (profitPercentage > 10) {
      profitabilityRating = 'Fair';
    } else if (profitPercentage > 0) {
      profitabilityRating = 'Low';
    } else {
      profitabilityRating = 'Not Profitable';
    }
  }
  
  // Generate recommendation
  let recommendation = '';
  if (estimatedNetProfit <= 0) {
    recommendation = 'Avoid - Not profitable after shipping costs';
  } else if (totalScore >= 80) {
    recommendation = 'Strongly Buy - Excellent opportunity!';
  } else if (totalScore >= 70) {
    recommendation = 'Buy - Very good opportunity';
  } else if (totalScore >= 60) {
    recommendation = 'Consider Buying - Good potential';
  } else if (totalScore >= 50) {
    recommendation = 'Watch - Decent potential but some concerns';
  } else if (totalScore >= 40) {
    recommendation = 'Proceed with Caution - Marginal opportunity';
  } else {
    recommendation = 'Avoid - Poor investment opportunity';
  }
  
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
        // Update existing entry
        const existingIndex = existingAnalyses.findIndex(a => 
          a.sourceDeal?.setNumber === setNumber
        );
        
        if (existingIndex !== -1) {
          // Keep historical data if you want to track changes over time
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
        // Add new entry
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