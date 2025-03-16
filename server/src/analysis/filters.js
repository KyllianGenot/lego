/**
 * Determines if a listing is relevant to the searched set
 * @param {string} listingTitle - The title from Vinted listing
 * @param {string} searchedSet - The set ID we're looking for
 * @returns {boolean} Whether listing seems relevant
 */
function isRelevantListing(listingTitle, searchedSet) {
  const cleanedTitle = listingTitle.toLowerCase();
  return cleanedTitle.includes(searchedSet.toLowerCase()) || cleanedTitle.includes('lego ' + searchedSet.toLowerCase());
}

module.exports = { isRelevantListing };