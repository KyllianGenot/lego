import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeDeal, getTopDeals } from '../api';

function Home() {
  const [input, setInput] = useState('');
  const [topDeals, setTopDeals] = useState({ topByDealScore: [], topByProfit: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopDeals = async () => {
      setLoading(true);
      try {
        const data = await getTopDeals();
        console.log('Fetched top deals in Home.js:', data);
        setTopDeals(data);
      } catch (error) {
        console.error('Error fetching top deals:', error);
        alert('Failed to load top deals');
      } finally {
        setLoading(false);
      }
    };
    fetchTopDeals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      const analysis = await analyzeDeal(input);
      if (analysis && analysis._id) {
        navigate(`/deal/${analysis._id}`, { state: { analysis } });
      } else {
        alert('No analysis found for the given input');
      }
    } catch (error) {
      alert('Error analyzing deal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4">
      <div className="container mx-auto">
        <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
          LEGO Deal Analyzer
        </h1>
        <form onSubmit={handleSubmit} className="mb-12 max-w-lg mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter LEGO set ID or Dealabs link"
            className="border-2 border-indigo-200 p-3 w-full rounded-lg shadow-md focus:outline-none focus:border-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            className="mt-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white p-3 rounded-lg w-full shadow-md hover:scale-105 transition-transform"
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        {loading ? (
          <div className="text-center text-gray-600">Loading top deals...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
                Top 5 by Deal Score
              </h2>
              {topDeals.topByDealScore.length === 0 ? (
                <p className="text-gray-600">No deals available.</p>
              ) : (
                topDeals.topByDealScore.map((deal, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-lg mb-4 hover:shadow-xl transition-shadow">
                    <p className="font-bold text-gray-800">
                      {deal.sourceDeal?.title || 'Unknown Title'} (Set: {deal.sourceDeal?.setNumber || deal.id || 'N/A'})
                    </p>
                    <p className="text-gray-600">
                      Price: {deal.sourceDeal?.price != null ? deal.sourceDeal.price.toFixed(2) : 'N/A'}€
                    </p>
                    <p className="text-gray-600">Deal Score: {deal.dealScore || 'N/A'}/100</p>
                    <p className="text-gray-600">Recommendation: {deal.recommendation || 'N/A'}</p>
                    <button
                      onClick={() => navigate(`/deal/${deal._id}`, { state: { analysis: deal } })}
                      className="mt-2 text-indigo-500 hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
                Top 5 by Profit
              </h2>
              {topDeals.topByProfit.length === 0 ? (
                <p className="text-gray-600">No deals available.</p>
              ) : (
                topDeals.topByProfit.map((deal, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-lg mb-4 hover:shadow-xl transition-shadow">
                    <p className="font-bold text-gray-800">
                      {deal.sourceDeal?.title || 'Unknown Title'} (Set: {deal.sourceDeal?.setNumber || deal.id || 'N/A'})
                    </p>
                    <p className="text-gray-600">
                      Price: {deal.sourceDeal?.price != null ? deal.sourceDeal.price.toFixed(2) : 'N/A'}€
                    </p>
                    <p className="text-gray-600">
                      Estimated Net Profit: {deal.estimatedNetProfit != null ? deal.estimatedNetProfit.toFixed(2) : 'N/A'}€
                    </p>
                    <p className="text-gray-600">Recommendation: {deal.recommendation || 'N/A'}</p>
                    <button
                      onClick={() => navigate(`/deal/${deal._id}`, { state: { analysis: deal } })}
                      className="mt-2 text-indigo-500 hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;