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
let activeFilters = new Set();

// DOM Elements
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals = document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const spanNbSales = document.querySelector('#nbSales');
const spanP5 = document.querySelector('#p5');
const spanP25 = document.querySelector('#p25');
const spanP50 = document.querySelector('#p50');
const spanLifetime = document.querySelector('#lifetime');
const discountSlider = document.querySelector('#discount-slider');
const discountInput = document.querySelector('#discount-input');
const mostCommentedFilterButton = document.querySelector('#filter-most-commented');
const hotDealsFilterButton = document.querySelector('#filter-hot-deals');
const filterFavoritesButton = document.querySelector('#filter-favorites');
const clearFiltersButton = document.querySelector('#clear-filters');
const sortSelect = document.querySelector('#sort-select');
const loadingIndicator = document.querySelector('#loading');

// Store favorite deals
let favoriteDeals = JSON.parse(localStorage.getItem('favoriteDeals')) || [];

/**
 * Show/hide loading indicator
 * @param {Boolean} show - Whether to show loading indicator
 */
const toggleLoading = (show) => {
  loadingIndicator.style.display = show ? 'flex' : 'none';
};

/**
 * Update button states based on active filters
 */
const updateFilterStates = () => {
  const filterButtons = [
    mostCommentedFilterButton,
    hotDealsFilterButton,
    filterFavoritesButton
  ];

  filterButtons.forEach(button => {
    button.classList.toggle('active', activeFilters.has(button.id));
    button.setAttribute('aria-pressed', activeFilters.has(button.id));
  });
};

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
  toggleLoading(true);
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error('API Error:', body);
      return { currentDeals, currentPagination };
    }

    return body.data;
  } catch (error) {
    console.error('Fetch Error:', error);
    return { currentDeals, currentPagination };
  } finally {
    toggleLoading(false);
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

  const creationDate = new Date(deals[0].published * 1000);
  const now = new Date();
  const diffTime = Math.abs(now - creationDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
 * Render list of deals with semantic markup
 * @param  {Array} deals
 */
const renderDeals = deals => {
  if (deals.length === 0) {
    sectionDeals.innerHTML = `
      <div class="no-deals">
        <i class="fas fa-box-open"></i>
        <p>No deal found. Try ajusting your filters.</p>
      </div>
    `;
    return;
  }
  const template = deals
    .map(deal => {
      const isFavorited = favoriteDeals.some(fav => fav.uuid === deal.uuid);
      return `
      <article class="deal-card">
        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" 
                data-uuid="${deal.uuid}"
                aria-label="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
          <i class="${isFavorited ? 'fas fa-heart' : 'far fa-heart'}"></i>
        </button>
        
        <div class="deal-content">
          <h3 class="deal-title">${deal.title}</h3>
          
          <div class="deal-property">
            <span class="deal-label">Set ID</span>
            <span class="deal-value">${deal.id}</span>
          </div>
          
          <div class="deal-property">
            <span class="deal-label">Price</span>
            <span class="deal-value">$${deal.price}</span>
          </div>
          
          <div class="deal-property">
            <span class="deal-label">Discount</span>
            <span class="deal-value">${deal.discount}%</span>
          </div>
          
          <div class="deal-property">
            <span class="deal-label">Comments</span>
            <span class="deal-value">${deal.comments}</span>
          </div>
          
          <div class="deal-property">
            <span class="deal-label">Temperature</span>
            <span class="deal-value">${deal.temperature}°C</span>
          </div>
        </div>
        
        <a href="${deal.link}" target="_blank" class="deal-link">
          <i class="fas fa-external-link-alt"></i>
          View Deal
        </a>
      </article>
    `;
    })
    .join('');

  sectionDeals.innerHTML = template;

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
    (_, index) => `<option value="${index + 1}">${index + 1}</option>`
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
  const options = ['<option value="">All Sets</option>']
    .concat(ids.map(id => `<option value="${id}">Set #${id}</option>`))
    .join('');
  selectLegoSetIds.innerHTML = options;
};

/**
 * Update all sales-related indicators
 * @param {Array} filteredDeals - Filtered deals data
 */
const updateSalesIndicators = (filteredDeals) => {
  const priceStats = calculatePriceStats(filteredDeals);
  const lifetimeDays = calculateLifetime(filteredDeals);

  spanNbSales.textContent = filteredDeals.length;
  spanP5.textContent = `$${priceStats.p5.toFixed(2)}`;
  spanP25.textContent = `$${priceStats.p25.toFixed(2)}`;
  spanP50.textContent = `$${priceStats.p50.toFixed(2)}`;
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
    renderLegoSetIds(deals);
    spanNbDeals.textContent = pagination.count;
  }
  updateSalesIndicators(deals);
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
    favoriteDeals.push(deal);
  } else {
    favoriteDeals.splice(index, 1);
  }

  localStorage.setItem('favoriteDeals', JSON.stringify(favoriteDeals));
  render(currentDeals, currentPagination);
};

/**
 * Handle discount filter updates
 * @param {Number} value - Discount percentage
 */
const handleDiscountFilter = (value) => {
  const discount = Math.min(100, Math.max(0, parseInt(value) || 0));
  discountSlider.value = discount;
  discountInput.value = discount;

  if (discount > 0) {
    activeFilters.add('discount-filter');
    const filteredDeals = filterByDiscount(currentDeals, discount);
    render(filteredDeals, currentPagination, true);
  } else {
    activeFilters.delete('discount-filter');
    render(currentDeals, currentPagination);
  }
  updateFilterStates();
};

/**
 * Apply filter handler
 */
const applyFilter = (filterFunction, buttonId) => {
  // Basculer l'état du filtre
  if (activeFilters.has(buttonId)) {
    activeFilters.delete(buttonId);
  } else {
    activeFilters.add(buttonId);
  }

  // Appliquer tous les filtres actifs de manière cumulative
  let filteredDeals = [...currentDeals];
  
  activeFilters.forEach(filterId => {
    switch(filterId) {
      case 'filter-most-commented':
        filteredDeals = filterByMostCommented(filteredDeals);
        break;
      case 'filter-hot-deals':
        filteredDeals = filterByHotDeals(filteredDeals);
        break;
      case 'filter-favorites':
        filteredDeals = filterByFavorites(filteredDeals);
        break;
    }
  });

  // Appliquer le filtre de discount séparément
  const discountValue = parseInt(discountInput.value);
  if (discountValue > 0) {
    filteredDeals = filterByDiscount(filteredDeals, discountValue);
  }

  render(filteredDeals, currentPagination, true);
  updateFilterStates();
};

/**
 * Clear all filters and reset view
 */
const clearFilters = () => {
  activeFilters.clear();
  discountSlider.value = 0;
  discountInput.value = 0;
  render(currentDeals, currentPagination);
  updateFilterStates();
  selectLegoSetIds.value = '';
  sortSelect.value = 'date-desc';
  const sortedDeals = [...currentDeals].sort((a, b) => b.published - a.published);
  render(sortedDeals, currentPagination);
};

// Event Listeners
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

selectPage.addEventListener('change', async (event) => {
  const page = parseInt(event.target.value);
  const size = parseInt(selectShow.value);
  const deals = await fetchDeals(page, size);
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

discountSlider.addEventListener('input', (e) => handleDiscountFilter(e.target.value));
discountInput.addEventListener('input', (e) => handleDiscountFilter(e.target.value));

mostCommentedFilterButton.addEventListener('click', 
  () => applyFilter(filterByMostCommented, 'filter-most-commented'));

hotDealsFilterButton.addEventListener('click', 
  () => applyFilter(filterByHotDeals, 'filter-hot-deals'));

filterFavoritesButton.addEventListener('click', 
  () => applyFilter(filterByFavorites, 'filter-favorites'));

clearFiltersButton.addEventListener('click', clearFilters);

sortSelect.addEventListener('change', () => {
  const sortValue = sortSelect.value;
  let sortedDeals = [...currentDeals];

  switch(sortValue) {
    case 'price-asc':
      sortedDeals.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case 'price-desc':
      sortedDeals.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    case 'date-asc':
      sortedDeals.sort((a, b) => a.published - b.published);
      break;
    case 'date-desc':
      sortedDeals.sort((a, b) => b.published - a.published);
      break;
  }
  
  render(sortedDeals, currentPagination, true);
});

selectLegoSetIds.addEventListener('change', (event) => {
  const selectedSetId = event.target.value;
  const filteredDeals = currentDeals.filter(deal => deal.id === selectedSetId);
  render(filteredDeals, currentPagination, true);
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    toggleLoading(true); // Affiche l'indicateur de chargement
    const data = await fetchDeals();
    
    // Tri initial selon le paramètre par défaut (Newest First)
    const sortedDeals = [...data.result].sort((a, b) => b.published - a.published);
    
    setCurrentDeals({
      result: sortedDeals,
      meta: data.meta
    });

    render(currentDeals, currentPagination);
    
    // Réinitialisation des sélecteurs
    selectLegoSetIds.value = ''; // Aucun set sélectionné par défaut
    sortSelect.value = 'date-desc'; // Force le tri "Newest First"

  } catch (error) {
    console.error('Initialization Error:', error);
    loadingIndicator.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      Error loading data. Please try again later.
    `;
  } finally {
    toggleLoading(false); // Cache l'indicateur dans tous les cas
  }
});