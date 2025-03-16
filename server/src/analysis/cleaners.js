/**
 * Cleans and normalizes set name for better matching
 * @param {string} title - The raw title
 * @returns {string} Cleaned set name
 */
function cleanSetName(title) {
  return title
    .replace(/lego|set|jeu|construction|de|la|le|du|des|-/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { cleanSetName };