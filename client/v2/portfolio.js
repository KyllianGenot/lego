// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};

// instantiate the selectors (CORRIGÉ)
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals = document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const spanNbSales = document.querySelector('#nbSales');
const spanP5 = document.querySelector('#indicators div:nth-child(4) span:last-child');
const spanP25 = document.querySelector('#indicators div:nth-child(5) span:last-child');
const spanP50 = document.querySelector('#indicators div:nth-child(6) span:last-child');
const spanLifetime = document.querySelector('#indicators div:nth-child(7) span:last-child');
const discountFilterInput = document.querySelector('#discount-filter');
const applyDiscountFilterButton = document.querySelector('#apply-discount-filter');
const mostCommentedFilterButton = document.querySelector('#filter-most-commented');
const hotDealsFilterButton = document.querySelector('#filter-hot-deals');
const filterFavoritesButton = document.querySelector('#filter-favorites');
const clearFiltersButton = document.querySelector('#clear-filters');
const sortSelect = document.querySelector('#sort-select');

// Store favorite deals
let favoriteDeals = JSON.parse(localStorage.getItem('favoriteDeals')) || [];

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({ result, meta }) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return { currentDeals, currentPagination };
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return { currentDeals, currentPagination };
  }
};

/**
 * Calculate price statistics from deals data
 * @param {Array} deals 
 * @returns {Object} calculated statistics
 */
const calculatePriceStats = (deals) => {
  const prices = deals
    .map(deal => parseFloat(deal.price))
    .filter(price => !isNaN(price))
    .sort((a, b) => a - b);

  if (prices.length === 0) return { p5: 0, p25: 0, p50: 0 };

  return {
    p5: prices[Math.floor(prices.length * 0.05)] || prices[0],
    p25: prices[Math.floor(prices.length * 0.25)] || prices[0],
    p50: prices[Math.floor(prices.length * 0.5)] || prices[0]
  };
};

/**
 * Calculate lifetime in days from deal creation date to now
 * @param {Array} deals 
 * @returns {Number} lifetime in days
 */
const calculateLifetime = (deals) => {
  if (deals.length === 0) return 0;

  // Get the creation date of the deal (assuming all deals have the same published date for a given set)
  const creationDate = new Date(deals[0].published * 1000); // Convert UNIX timestamp to milliseconds
  const now = new Date(); // Current date

  // Calculate difference in days
  const diffTime = Math.abs(now - creationDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
};

/**
 * Filter deals by discount percentage
 * @param {Array} deals - list of deals
 * @param {Number} discount - minimum discount percentage
 * @returns {Array} filtered deals
 */
const filterByDiscount = (deals, discount) => {
  return deals.filter(deal => deal.discount >= discount);
};

/**
 * Filter deals by most commented (more than 15 comments)
 * @param {Array} deals - list of deals
 * @returns {Array} filtered deals
 */
const filterByMostCommented = (deals) => {
  return deals.filter(deal => deal.comments > 15);
};

/**
 * Filter deals by hot deals (temperature > 100)
 * @param {Array} deals - list of deals
 * @returns {Array} filtered deals
 */
const filterByHotDeals = (deals) => {
  return deals.filter(deal => deal.temperature > 100);
};

/**
 * Filter deals by favorites
 * @param {Array} deals - list of deals
 * @returns {Array} filtered deals
 */
const filterByFavorites = (deals) => {
  return deals.filter(deal => favoriteDeals.some(fav => fav.uuid === deal.uuid));
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      const isFavorited = favoriteDeals.some(fav => fav.uuid === deal.uuid);
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}" target="_blank">${deal.title}</a>
        <span>${deal.price}</span>
        <span>Discount: ${deal.discount}%</span>
        <span>Comments: ${deal.comments}</span>
        <span>Temperature: ${deal.temperature}°</span>
        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-uuid="${deal.uuid}">
          ${isFavorited ? '❤️ Remove from Favorites' : '♡ Add to Favorites'}
        </button>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);

  // Add event listeners to favorite buttons
  document.querySelectorAll('.favorite-btn').forEach(button => {
    button.addEventListener('click', () => toggleFavorite(button.dataset.uuid));
  });
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const { currentPage, pageCount } = pagination;
  const options = Array.from(
    { length: pageCount },
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} deals
 */
const renderLegoSetIds = deals => {
  const ids = [...new Set(deals.map(deal => deal.id))];
  const options = ids.map(id =>
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render indicators
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const { count } = pagination;
  spanNbDeals.textContent = count;
};

/**
 * Update all sales-related indicators
 * @param {Array} filteredDeals - Filtered deals data
 */
const updateSalesIndicators = (filteredDeals) => {
  const priceStats = calculatePriceStats(filteredDeals);
  const lifetimeDays = calculateLifetime(filteredDeals);

  spanNbSales.textContent = filteredDeals.length;
  spanP5.textContent = priceStats.p5.toFixed(2);
  spanP25.textContent = priceStats.p25.toFixed(2);
  spanP50.textContent = priceStats.p50.toFixed(2);
  spanLifetime.textContent = `${lifetimeDays} days`;
};

/**
 * Render all components
 * @param  {Array} deals
 * @param  {Object} pagination
 * @param  {Boolean} [isFiltered=false] - whether the deals are filtered
 */
const render = (deals, pagination, isFiltered = false) => {
  renderDeals(deals);
  if (!isFiltered) {
    renderPagination(pagination);
    renderIndicators(pagination);
    renderLegoSetIds(deals);
  }
};

/**
 * Toggle a deal as favorite
 * @param {String} uuid - UUID of the deal to toggle
 */
const toggleFavorite = (uuid) => {
  const deal = currentDeals.find(d => d.uuid === uuid);
  if (!deal) return;

  const index = favoriteDeals.findIndex(fav => fav.uuid === uuid);
  if (index === -1) {
    favoriteDeals.push(deal); // Add to favorites
  } else {
    favoriteDeals.splice(index, 1); // Remove from favorites
  }

  // Save favorites to localStorage
  localStorage.setItem('favoriteDeals', JSON.stringify(favoriteDeals));

  // Re-render deals
  render(currentDeals, currentPagination);
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Select the page to display
 */
selectPage.addEventListener('change', async (event) => {
  const page = parseInt(event.target.value);
  const size = parseInt(selectShow.value);
  const deals = await fetchDeals(page, size);
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Apply discount filter
 */
applyDiscountFilterButton.addEventListener('click', () => {
  const discount = parseInt(discountFilterInput.value);
  if (isNaN(discount) || discount < 0 || discount > 100) {
    alert('Veuillez entrer un pourcentage de réduction valide entre 0 et 100.');
    return;
  }
  const filteredDeals = filterByDiscount(currentDeals, discount);
  render(filteredDeals, currentPagination, true);
});

/**
 * Apply most commented filter
 */
mostCommentedFilterButton.addEventListener('click', () => {
  const filteredDeals = filterByMostCommented(currentDeals);
  render(filteredDeals, currentPagination, true);
});

/**
 * Apply hot deals filter
 */
hotDealsFilterButton.addEventListener('click', () => {
  const filteredDeals = filterByHotDeals(currentDeals);
  render(filteredDeals, currentPagination, true);
});

/**
 * Apply favorites filter
 */
filterFavoritesButton.addEventListener('click', () => {
  const filteredDeals = filterByFavorites(currentDeals);
  render(filteredDeals, currentPagination, true);
});

/**
 * Clear all filters
 */
clearFiltersButton.addEventListener('click', () => {
  render(currentDeals, currentPagination);
});

/**
 * Sort deals by price
 * @param {Array} deals - list of deals
 * @param {String} order - 'asc' for ascending, 'desc' for descending
 * @returns {Array} sorted deals
 */
const sortByPrice = (deals, order) => {
  return [...deals].sort((a, b) => {
    const priceA = parseFloat(a.price);
    const priceB = parseFloat(b.price);
    return order === 'asc' ? priceA - priceB : priceB - priceA;
  });
};

/**
 * Sort deals by date
 * @param {Array} deals - list of deals
 * @param {String} order - 'asc' for recent first, 'desc' for oldest first
 * @returns {Array} sorted deals
 */
const sortByDate = (deals, order) => {
  return [...deals].sort((a, b) => {
    const dateA = new Date(a.published * 1000);
    const dateB = new Date(b.published * 1000);
    return order === 'asc' ? dateB - dateA : dateA - dateB;
  });
};

// Sort selector handler
sortSelect.addEventListener('change', () => {
  const sortValue = sortSelect.value;
  let sortedDeals = currentDeals;

  switch(sortValue) {
    case 'price-asc':
      sortedDeals = sortByPrice(currentDeals, 'asc');
      break;
    case 'price-desc':
      sortedDeals = sortByPrice(currentDeals, 'desc');
      break;
    case 'date-asc':
      sortedDeals = sortByDate(currentDeals, 'asc');
      break;
    case 'date-desc':
      sortedDeals = sortByDate(currentDeals, 'desc');
      break;
    default:
      sortedDeals = currentDeals;
  }
  render(sortedDeals, currentPagination, true);
});

/**
 * Handle Lego set selection and update indicators
 */
selectLegoSetIds.addEventListener('change', (event) => {
  const selectedSetId = event.target.value;
  const filteredDeals = currentDeals.filter(deal => deal.id === selectedSetId);
  
  render(filteredDeals, currentPagination, true);
  updateSalesIndicators(filteredDeals);
});

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});