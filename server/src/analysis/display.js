/**
 * Enhanced display module for Lego Deal Calculator
 * Provides comprehensive visualization of the 100-point scoring system
 * and detailed profitability metrics
 */

const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const subDivider = '──────────────────────────────────────────────────────────────────────';

/**
 * Gets an appropriate emoji based on the score value
 * @param {number} score - Score value
 * @param {number} maxScore - Maximum possible score for this category
 * @returns {string} Emoji representing the score level
 */
function getScoreEmoji(score, maxScore) {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return '🔥'; // Excellent
  if (percentage >= 60) return '✅'; // Good
  if (percentage >= 40) return '⚖️ '; // Fair - Added space after the scale emoji to fix alignment
  if (percentage >= 20) return '⚠️ '; // Poor - Added space after the warning emoji to fix alignment
  return '❌'; // Very poor
}

/**
 * Creates a visual progress bar for scores
 * @param {number} score - Current score
 * @param {number} maxScore - Maximum possible score
 * @returns {string} ASCII progress bar
 */
function createProgressBar(score, maxScore) {
  const barLength = 20;
  const filledLength = Math.round((score / maxScore) * barLength);
  const emptyLength = barLength - filledLength;
  
  return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
}

/**
 * Pads a string to ensure consistent width for alignment
 * @param {string} str - String to pad
 * @param {number} length - Desired length
 * @returns {string} Padded string
 */
function padString(str, length) {
  return str.toString().padEnd(length);
}

/**
 * Displays comprehensive profitability analysis in the console
 * @param {Object} analysis - Profitability analysis results from calculateProfitability
 */
function displayProfitabilitySummary(analysis) {
  console.log(`\n${divider}`);
  console.log(`📊  LEGO DEAL ANALYZER - COMPREHENSIVE REPORT`);
  console.log(`${divider}\n`);

  // Display source deal information
  if (analysis.sourceDeal) {
    console.log(`🛒  SOURCE DEAL DETAILS`);
    console.log(`   Title: ${analysis.sourceDeal.title || 'Unknown'}`);
    console.log(`   Price: ${analysis.purchasePrice}€ (${analysis.purchasePriceWithShipping}€ with shipping)`);
    console.log(`   Temperature: ${analysis.sourceDeal.temperature || 0}° | Age: ${analysis.sourceDealAge || 0} days`);
    console.log(`   Comments: ${analysis.sourceDeal.commentsCount || 0}`);
    if (analysis.sourceDeal.link) {
      console.log(`   Link: ${analysis.sourceDeal.link}`);
    }
    console.log('');
  }

  // Display market analysis information
  console.log(`📈  VINTED MARKET ANALYSIS`);
  console.log(`   Found ${analysis.newConditionListingsCount} new/like-new listings out of ${analysis.vintedListingsCount} total`);

  if (analysis.newConditionListingsCount === 0) {
    console.log('\n   ⚠️  No relevant listings found on Vinted');
    console.log('   ⚠️  Unable to determine profitability without market data\n');
    return;
  }

  console.log(`   Average Price: ${analysis.averageSellingPrice}€`);
  console.log(`   Median Price: ${analysis.medianSellingPrice}€`);
  console.log(`   Price Range: ${analysis.lowerQuartilePrice}€ - ${analysis.upperQuartilePrice}€`);
  console.log(`   Price Stability: CV ${analysis.coefficientOfVariation.toFixed(1)}% (${analysis.priceStandardDeviation}€ std dev)`);
  console.log(`   Average Condition: ${analysis.averageCondition} | Average Favorites: ${analysis.averageFavorites}\n`);

  // Display profitability section
  console.log('💰  PROFITABILITY METRICS');
  
  const profitEmoji = analysis.estimatedNetProfit > 0 ? '✅' : '❌';
  console.log(`   Purchase Price: ${analysis.purchasePriceWithShipping}€ (with shipping)`);
  console.log(`   Est. Net Profit: ${profitEmoji} ${analysis.estimatedNetProfit}€ (${analysis.profitPercentage}% ROI)`);
  console.log(`   Profitability Rating: ${getScoreEmoji(analysis.scoreBreakdown.profitScore, 30)} ${analysis.profitabilityRating}`);
  console.log('');

  // Display recommendation and total score
  const scorePercentage = (analysis.dealScore / 100) * 100;
  let scoreEmoji = '❓';
  if (scorePercentage >= 80) scoreEmoji = '🌟';
  else if (scorePercentage >= 70) scoreEmoji = '🔥';
  else if (scorePercentage >= 60) scoreEmoji = '✅';
  else if (scorePercentage >= 50) scoreEmoji = '⚖️ '; // Added space to fix alignment
  else if (scorePercentage >= 40) scoreEmoji = '⚠️ '; // Added space to fix alignment
  else scoreEmoji = '❌';

  console.log(`${subDivider}`);
  console.log(`🏆  OVERALL DEAL SCORE: ${scoreEmoji} ${analysis.dealScore}/100 (${scorePercentage.toFixed(0)}%)`);
  console.log(`   ${createProgressBar(analysis.dealScore, 100)} ${analysis.dealScore}/100`);
  console.log(`\n   ${getScoreEmoji(analysis.dealScore, 100)} RECOMMENDATION: ${analysis.recommendation}`);
  console.log(`${subDivider}\n`);

  // Display detailed score breakdown
  console.log(`📊  DETAILED SCORE BREAKDOWN (${analysis.dealScore}/100 points total)`);
  
  const { profitScore, marketScore, dealQualityScore, liquidityScore, riskScore } = analysis.scoreBreakdown;
  
  // Standardize the score display format for better alignment
  console.log(`   Profit Score:       ${getScoreEmoji(profitScore, 30)} ${padString(profitScore + '/30', 5)}  ${createProgressBar(profitScore, 30)}`);
  console.log(`   Market Score:       ${getScoreEmoji(marketScore, 25)} ${padString(marketScore + '/25', 5)}  ${createProgressBar(marketScore, 25)}`);
  console.log(`   Deal Quality Score: ${getScoreEmoji(dealQualityScore, 20)} ${padString(dealQualityScore + '/20', 5)}  ${createProgressBar(dealQualityScore, 20)}`);
  console.log(`   Liquidity Score:    ${getScoreEmoji(liquidityScore, 15)} ${padString(liquidityScore + '/15', 5)}  ${createProgressBar(liquidityScore, 15)}`);
  console.log(`   Risk Score:         ${getScoreEmoji(riskScore, 10)} ${padString(riskScore + '/10', 5)}  ${createProgressBar(riskScore, 10)}`);

  // Display footer information
  console.log(`\n${divider}`);
  console.log(`✅  Analysis completed: ${new Date().toLocaleString()}`);
  console.log(`   Data timestamp: ${analysis.timestamp}`);
  console.log(`${divider}\n`);
}

/**
 * Displays a quick summary of profitability for CLI usage
 * @param {Object} analysis - Profitability analysis results
 */
function displayQuickSummary(analysis) {
  if (analysis.newConditionListingsCount === 0) {
    console.log(`⚠️  No market data available for this item`);
    return;
  }

  const profitEmoji = analysis.estimatedNetProfit > 0 ? '✅' : '❌';
  const scoreEmoji = analysis.dealScore >= 70 ? '🔥' : 
                    analysis.dealScore >= 60 ? '✅' : 
                    analysis.dealScore >= 50 ? '⚖️ ' : '⚠️ '; // Added spaces for alignment
  
  console.log(`\n${scoreEmoji} Deal Score: ${analysis.dealScore}/100 | ${profitEmoji} Net Profit: ${analysis.estimatedNetProfit}€ (${analysis.profitPercentage}% ROI)`);
  console.log(`📊 Avg: ${analysis.averageSellingPrice}€ | ${analysis.newConditionListingsCount} listings | ${analysis.recommendation}`);
}

module.exports = { 
  displayProfitabilitySummary,
  displayQuickSummary
};