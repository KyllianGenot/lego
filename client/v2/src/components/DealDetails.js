import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDealAnalysis } from '../api';
import { 
  ArrowLeft, Award, TrendingUp, ExternalLink, ShoppingBag, 
  BarChart3, Star, Heart, Package, AlertTriangle 
} from 'lucide-react';

function DealDetails() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const data = await getDealAnalysis(id);
        if (data && data.sourceDeal) {
          setAnalysis(data);
        } else {
          setError("Invalid analysis data received");
        }
      } catch (err) {
        console.error("Error fetching deal analysis:", err);
        setError(`Failed to load deal analysis: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getRecommendationColor = (recommendation) => {
    if (recommendation?.includes("Buy")) return "text-green-500";
    if (recommendation?.includes("Consider")) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23] flex flex-col items-center justify-center p-4">
        <AlertTriangle className="text-red-500 mb-4" size={48} />
        <div className="text-xl text-red-500 mb-4">{error}</div>
        <button
          onClick={() => navigate("/")}
          className="bg-[#1a1d23] text-white px-6 py-3 rounded-xl hover:bg-[#252a33] transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!analysis || !analysis.sourceDeal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23] flex flex-col items-center justify-center p-4">
        <Package className="text-gray-400 mb-4" size={48} />
        <div className="text-xl text-gray-400 mb-4">No analysis found</div>
        <button
          onClick={() => navigate("/")}
          className="bg-[#1a1d23] text-white px-6 py-3 rounded-xl hover:bg-[#252a33] transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23] text-gray-200 py-8 px-6">
      <div className="container mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-gray-400 hover:text-white mb-12 transition-colors"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Home
        </button>

        <div className="glass-card rounded-2xl p-8 border border-gray-800/50">
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            {analysis.sourceDeal.imageUrl && (
              <div className="w-full md:w-1/3">
                <img
                  src={analysis.sourceDeal.imageUrl}
                  alt={analysis.sourceDeal.title}
                  className="w-full rounded-xl shadow-lg"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-3 text-white">{analysis.sourceDeal.title}</h1>
              <p className="text-gray-400 mb-6">Set: {analysis.sourceDeal.setNumber}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-2">
                    <Award className="text-yellow-500 mr-2" size={20} />
                    <h3 className="text-gray-400">Deal Score</h3>
                  </div>
                  <p className={`text-2xl font-bold ${getScoreColor(analysis.dealScore)}`}>
                    {analysis.dealScore}/100
                  </p>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="text-green-500 mr-2" size={20} />
                    <h3 className="text-gray-400">Est. Net Profit</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    {analysis.estimatedNetProfit ? `${analysis.estimatedNetProfit.toFixed(2)}€` : "N/A"}
                  </p>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-2">
                    <ShoppingBag className="text-blue-500 mr-2" size={20} />
                    <h3 className="text-gray-400">Recommendation</h3>
                  </div>
                  <p className={`text-xl font-bold ${getRecommendationColor(analysis.recommendation)}`}>
                    {analysis.recommendation}
                  </p>
                </div>
              </div>

              <div className="glass-card p-6 rounded-xl border border-gray-800/30">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="flex justify-between mb-3">
                      <span className="text-gray-400">Price:</span>
                      <span className="font-medium text-white">
                        {analysis.sourceDeal.price ? analysis.sourceDeal.price.toFixed(2) : "N/A"}€
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Temperature:</span>
                      <span className="font-medium text-white">{analysis.sourceDeal.temperature}°</span>
                    </p>
                  </div>
                  <div>
                    <p className="flex justify-between mb-3">
                      <span className="text-gray-400">Comments:</span>
                      <span className="font-medium text-white">{analysis.sourceDeal.commentsCount}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Source:</span>
                      <a
                        href={analysis.sourceDeal.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center"
                      >
                        Dealabs <ExternalLink className="ml-1" size={14} />
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {analysis.vintedStats && (
            <div>
              <h2 className="text-2xl font-bold mb-6 gradient-text">
                Vinted Market Analysis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-3">
                    <BarChart3 className="text-blue-400 mr-3" size={20} />
                    <div>
                      <p className="text-gray-400 text-sm">Listings (New/Like-New)</p>
                      <p className="font-medium text-lg">{analysis.vintedStats.listingsCount}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-3">
                    <TrendingUp className="text-green-400 mr-3" size={20} />
                    <div>
                      <p className="text-gray-400 text-sm">Average Price</p>
                      <p className="font-medium text-lg">
                        {analysis.vintedStats.averageSellingPrice
                          ? analysis.vintedStats.averageSellingPrice.toFixed(2)
                          : "N/A"}
                        €
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-3">
                    <Star className="text-yellow-400 mr-3" size={20} />
                    <div>
                      <p className="text-gray-400 text-sm">Average Condition</p>
                      <p className="font-medium text-lg">
                        {analysis.vintedStats.averageCondition
                          ? analysis.vintedStats.averageCondition.toFixed(2)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-3">
                    <Heart className="text-red-400 mr-3" size={20} />
                    <div>
                      <p className="text-gray-400 text-sm">Average Favorites</p>
                      <p className="font-medium text-lg">
                        {analysis.vintedStats.averageFavorites
                          ? analysis.vintedStats.averageFavorites.toFixed(2)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DealDetails;