import axios from 'axios';

const API_URL = 'https://lego-backend-pp5v.onrender.com';

/** Analyze a deal by calling the backend's /analyze endpoint */
export const analyzeDeal = async (input) => {
  try {
    const response = await axios.post(`${API_URL}/analyze`, { input });
    return response.data;
  } catch (error) {
    console.error('Error analyzing deal:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/** Fetch all deals from the backend */
export const getAllDeals = async () => {
  try {
    const response = await axios.get(`${API_URL}/deals/search`, { params: { limit: 1000 } });
    console.log('Raw deals from /deals/search:', response.data.results); // Debug log
    return response.data.results;
  } catch (error) {
    console.error('Error fetching deals:', error.response ? error.response.data : error.message);
    return [];
  }
};

/** Fetch sales for a specific set ID */
export const getSalesForSet = async (setId) => {
  try {
    const response = await axios.get(`${API_URL}/sales/search`, {
      params: { legoSetId: setId, limit: 100 },
    });
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching sales for set ${setId}:`, error.response ? error.response.data : error.message);
    return [];
  }
};

/** Get top 5 deals by deal score and profit */
export const getTopDeals = async () => {
  try {
    const deals = await getAllDeals();
    
    // Filter out any deals with missing required fields
    const validDeals = deals.filter(deal => 
      deal.dealScore != null && 
      deal.estimatedNetProfit != null && 
      deal.recommendation != null &&
      deal.sourceDeal && 
      deal.sourceDeal.title && 
      deal.sourceDeal.price != null
    );

    console.log('Valid deals after filtering:', validDeals); // Debug log

    // Sort for top by deal score
    const topByDealScore = [...validDeals]
      .sort((a, b) => b.dealScore - a.dealScore)
      .slice(0, 5);

    // Sort for top by profit
    const topByProfit = [...validDeals]
      .sort((a, b) => parseFloat(b.estimatedNetProfit) - parseFloat(a.estimatedNetProfit))
      .slice(0, 5);

    return { topByDealScore, topByProfit };
  } catch (error) {
    console.error('Error fetching top deals:', error.response ? error.response.data : error.message);
    return { topByDealScore: [], topByProfit: [] };
  }
};

/** Get analysis for a specific analysis ID (using _id from the analyzes collection) */
export const getDealAnalysis = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/deals/${id}`);
    console.log(`Fetched analysis for id ${id}:`, response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error(`Error fetching analysis for id ${id}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};