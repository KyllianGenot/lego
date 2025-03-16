/**
 * Calculates profitability metrics
 * @param {Object} sourceDeal - Deal from source site
 * @param {Array} vintedDeals - Matching deals from Vinted
 * @returns {Object} Profitability analysis
 */
function calculateProfitability(sourceDeal, vintedDeals) {
  const sourcePrice = sourceDeal ? sourceDeal.price : null;

  const dealsWithPrices = vintedDeals.filter(deal => deal.price !== null && deal.price !== undefined);
  const sortedDeals = [...dealsWithPrices].sort((a, b) => a.price - b.price);

  if (dealsWithPrices.length === 0) {
    return {
      sourceDeal,
      vintedListingsCount: vintedDeals.length,
      relevantListingsCount: 0,
      averageSellingPrice: null,
      medianSellingPrice: null,
      lowerQuartilePrice: null,
      upperQuartilePrice: null,
      purchasePrice: sourcePrice,
      potentialProfit: null,
      profitPercentage: null,
      estimatedNetProfit: null,
      estimatedNetProfitWithShipping: null,
      profitabilityRating: 'Unknown (No data)',
      vintedSamples: [],
      timestamp: new Date().toISOString()
    };
  }

  const avgSellingPrice = dealsWithPrices.reduce((sum, deal) => sum + deal.price, 0) / dealsWithPrices.length;
  const medianPrice = sortedDeals[Math.floor(sortedDeals.length / 2)].price;
  const lowerQuartileIndex = Math.floor(sortedDeals.length * 0.25);
  const upperQuartileIndex = Math.floor(sortedDeals.length * 0.75);
  const lowerQuartilePrice = sortedDeals[lowerQuartileIndex]?.price || sortedDeals[0].price;
  const upperQuartilePrice = sortedDeals[upperQuartileIndex]?.price || sortedDeals[sortedDeals.length - 1].price;

  const potentialProfit = sourcePrice ? avgSellingPrice - sourcePrice : null;
  const profitPercentage = sourcePrice && sourcePrice > 0 ? (potentialProfit / sourcePrice) * 100 : null;
  const vintedFeePercentage = 5;
  const vintedFixedFee = 0.70;
  const estimatedNetProfit = sourcePrice && avgSellingPrice ?
    (avgSellingPrice * (1 - vintedFeePercentage / 100) - vintedFixedFee) - sourcePrice :
    null;
  const shippingCost = 4.99;
  const netProfitWithShipping = estimatedNetProfit !== null ? estimatedNetProfit - shippingCost : null;

  let profitabilityRating = 'Unknown';
  if (profitPercentage !== null) {
    if (profitPercentage > 30) profitabilityRating = 'Excellent';
    else if (profitPercentage > 20) profitabilityRating = 'Good';
    else if (profitPercentage > 10) profitabilityRating = 'Fair';
    else if (profitPercentage > 0) profitabilityRating = 'Low';
    else profitabilityRating = 'Not Profitable';
  }

  return {
    sourceDeal,
    vintedListingsCount: vintedDeals.length,
    relevantListingsCount: dealsWithPrices.length,
    averageSellingPrice: parseFloat(avgSellingPrice.toFixed(2)),
    medianSellingPrice: parseFloat(medianPrice.toFixed(2)),
    lowerQuartilePrice: parseFloat(lowerQuartilePrice.toFixed(2)),
    upperQuartilePrice: parseFloat(upperQuartilePrice.toFixed(2)),
    purchasePrice: sourcePrice,
    potentialProfit: potentialProfit !== null ? parseFloat(potentialProfit.toFixed(2)) : null,
    profitPercentage: profitPercentage !== null ? parseFloat(profitPercentage.toFixed(2)) : null,
    estimatedNetProfit: estimatedNetProfit !== null ? parseFloat(estimatedNetProfit.toFixed(2)) : null,
    estimatedNetProfitWithShipping: netProfitWithShipping !== null ? parseFloat(netProfitWithShipping.toFixed(2)) : null,
    profitabilityRating,
    vintedSamples: sortedDeals.slice(0, 5),
    timestamp: new Date().toISOString()
  };
}

module.exports = { calculateProfitability };