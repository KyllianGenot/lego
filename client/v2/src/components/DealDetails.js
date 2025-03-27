import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDealAnalysis } from '../api';

function DealDetails() {
  const { id } = useParams(); // Represents the _id (e.g., "67e50c43faea7eff253552c1")
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const data = await getDealAnalysis(id);
        console.log('Fetched analysis in DealDetails:', data);
        if (data && data.sourceDeal) {
          setAnalysis(data);
        } else {
          setError('Invalid analysis data received: missing sourceDeal');
        }
      } catch (err) {
        console.error('Error fetching deal analysis:', err);
        setError(`Failed to load deal analysis: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!analysis || !analysis.sourceDeal) return <div className="min-h-screen flex items-center justify-center text-gray-600">No analysis found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
          {analysis.sourceDeal.title} (Set: {analysis.sourceDeal.setNumber})
        </h1>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-xl mb-2">Deal Score: <span className="font-bold">{analysis.dealScore}/100</span></p>
          <p className="text-xl mb-2">Estimated Net Profit: <span className="font-bold">{analysis.estimatedNetProfit ? analysis.estimatedNetProfit.toFixed(2) : 'N/A'}€</span></p>
          <p className="text-xl mb-4">Recommendation: <span className="font-bold">{analysis.recommendation}</span></p>

          <h2 className="text-2xl font-bold mb-2">Deal Details</h2>
          <p className="mb-1">Price: {analysis.sourceDeal.price ? analysis.sourceDeal.price.toFixed(2) : 'N/A'}€</p>
          <p className="mb-1">Temperature: {analysis.sourceDeal.temperature}°</p>
          <p className="mb-1">Comments: {analysis.sourceDeal.commentsCount}</p>
          <a
            href={analysis.sourceDeal.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            View on Dealabs
          </a>

          {analysis.vintedStats && (
            <>
              <h2 className="text-2xl font-bold mt-6 mb-2">Vinted Market Analysis</h2>
              <p className="mb-1">Listings (New/Like-New): {analysis.vintedStats.listingsCount}</p>
              <p className="mb-1">Average Selling Price: {analysis.vintedStats.averageSellingPrice ? analysis.vintedStats.averageSellingPrice.toFixed(2) : 'N/A'}€</p>
              <p className="mb-1">Median Selling Price: {analysis.vintedStats.medianSellingPrice ? analysis.vintedStats.medianSellingPrice.toFixed(2) : 'N/A'}€</p>
              <p className="mb-1">Price Range: {analysis.vintedStats.priceRange}</p>
              <p className="mb-1">Price Stability (CV): {analysis.vintedStats.priceStability}%</p>
              <p className="mb-1">Average Condition: {analysis.vintedStats.averageCondition ? analysis.vintedStats.averageCondition.toFixed(2) : 'N/A'}</p>
              <p className="mb-1">Average Favorites: {analysis.vintedStats.averageFavorites ? analysis.vintedStats.averageFavorites.toFixed(2) : 'N/A'}</p>
            </>
          )}
        </div>
        <button
          onClick={() => window.history.back()}
          className="mt-6 bg-gradient-to-r from-indigo-500 to-pink-500 text-white p-3 rounded-lg shadow-md hover:scale-105 transition-transform"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default DealDetails;