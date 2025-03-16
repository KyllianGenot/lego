const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/**
 * Displays profitability summary in the console with improved formatting
 * @param {Object} analysis - Profitability analysis results
 */
function displayProfitabilitySummary(analysis) {
  console.log(`\n${divider}`);
  console.log(`📊  LEGO SET PROFITABILITY ANALYSIS`);
  console.log(`${divider}\n`);

  if (analysis.sourceDeal) {
    console.log(`🛒  SOURCE DEAL`);
    console.log(`   Title: ${analysis.sourceDeal.title}`);
    console.log(`   Price: ${analysis.purchasePrice}€ (from ${analysis.sourceDeal.source})`);
    if (analysis.sourceDeal.link) {
      console.log(`   Link: ${analysis.sourceDeal.link}`);
    }
    console.log('');
  }

  console.log(`📈  VINTED MARKET ANALYSIS`);
  console.log(`   Found ${analysis.relevantListingsCount} relevant listings out of ${analysis.vintedListingsCount} total`);

  if (analysis.relevantListingsCount === 0) {
    console.log('\n   ⚠️  No relevant listings found on Vinted');
    console.log('   ⚠️  Unable to determine profitability without market data\n');
    return;
  }

  console.log(`   Average Price: ${analysis.averageSellingPrice}€`);
  console.log(`   Median Price: ${analysis.medianSellingPrice}€`);
  console.log(`   Price Range: ${analysis.lowerQuartilePrice}€ - ${analysis.upperQuartilePrice}€\n`);

  if (analysis.potentialProfit !== null) {
    console.log('💸  PROFITABILITY METRICS');
    console.log(`   Gross Profit: ${analysis.potentialProfit}€ (${analysis.profitPercentage}%)`);
    console.log(`   Net Profit (after Vinted fees): ${analysis.estimatedNetProfit}€`);
    console.log(`   Net Profit (including shipping): ${analysis.estimatedNetProfitWithShipping}€`);

    let ratingSymbol = '⚠️';
    if (analysis.profitabilityRating === 'Excellent') ratingSymbol = '🔥';
    else if (analysis.profitabilityRating === 'Good') ratingSymbol = '✅';
    else if (analysis.profitabilityRating === 'Fair') ratingSymbol = '⚖️';
    else if (analysis.profitabilityRating === 'Low') ratingSymbol = '⚠️';
    else if (analysis.profitabilityRating === 'Not Profitable') ratingSymbol = '❌';
    
    console.log(`   Profitability Rating: ${ratingSymbol}  ${analysis.profitabilityRating}\n`);
  }

  console.log('🔍  SAMPLE VINTED LISTINGS');
  if (analysis.vintedSamples && analysis.vintedSamples.length > 0) {
    analysis.vintedSamples.forEach((deal, index) => {
      console.log(`   ${index + 1}. ${deal.title} - ${deal.price}€`);
      if (deal.condition) console.log(`      Condition: ${deal.condition}`);
      if (deal.link) console.log(`      Link: ${deal.link}`);
      console.log('');
    });
  } else {
    console.log('   No sample listings available');
  }

  console.log(`${divider}`);
  console.log(`✅  Analysis saved to profitability_analysis.json`);
  console.log(`${divider}\n`);
}

module.exports = { displayProfitabilitySummary };