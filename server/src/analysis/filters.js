/**
 * Determines if a listing is relevant for the given LEGO set ID
 * @param {string} title - The title of the listing
 * @param {string} setId - The LEGO set ID
 * @returns {boolean} True if the listing is relevant, false otherwise
 */
const isRelevantListing = (title, setId) => {
  if (!title || !setId) return false;
  
  const lowerTitle = title.toLowerCase();
  const setIdStr = setId.toString();
  
  // Require the set number to be present in the title
  if (!lowerTitle.includes(setIdStr)) return false;
  
  // Exclude common accessory keywords unless explicitly part of the set
  const accessoryKeywords = [
    'support mural', 'stand', 'staffa', 'supporto', 'display', 'vitrine', 'étagère'
  ];
  const isAccessory = accessoryKeywords.some(keyword => lowerTitle.includes(keyword));
  
  // Allow only if it's explicitly a LEGO set (e.g., "Lego Technic 42172")
  const legoKeywords = ['lego', 'technic', 'set', 'kit', 'construction'];
  const isLegoSet = legoKeywords.some(keyword => lowerTitle.includes(keyword));
  
  return isLegoSet && !isAccessory;
};

module.exports = { isRelevantListing };