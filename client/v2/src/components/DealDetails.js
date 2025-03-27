"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDealAnalysis } from "../api";
import {
  ArrowLeft,
  Award,
  TrendingUp,
  ExternalLink,
  ShoppingBag,
  BarChart3,
  Star,
  Heart,
  Package,
  AlertTriangle,
  DollarSign,
  BarChart,
  ShoppingCart,
  Droplets,
  Shield,
  Percent,
} from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";

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
        console.log("Fetched analysis:", data);
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
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getRecommendationColor = (recommendation) => {
    if (recommendation?.includes("Buy")) return "text-green-500";
    if (recommendation?.includes("Consider")) return "text-yellow-500";
    if (recommendation?.includes("Watch")) return "text-yellow-500";
    return "text-red-500";
  };

  const getProfitColor = (profit) => {
    return profit >= 0 ? "text-green-500" : "text-red-500";
  };

  const renderScoreBar = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    let barColor = "bg-red-500";

    if (percentage >= 75) {
      barColor = "bg-green-500";
    } else if (percentage >= 50) {
      barColor = "bg-yellow-500";
    } else if (percentage >= 25) {
      barColor = "bg-orange-500";
    }

    return (
      <div className="w-full bg-gray-800 rounded-full h-2.5 mt-1">
        <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-blue-500 border-t-transparent"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23]">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <div className="text-xl text-red-500 mb-4">{error}</div>
          <button
            onClick={() => navigate("/")}
            className="bg-[#1a1d23] text-white px-6 py-3 rounded-xl hover:bg-[#252a33] transition-colors"
          >
            Back to Home
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!analysis || !analysis.sourceDeal) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23]">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <Package className="text-gray-400 mb-4" size={48} />
          <div className="text-xl text-gray-400 mb-4">No analysis found</div>
          <button
            onClick={() => navigate("/")}
            className="bg-[#1a1d23] text-white px-6 py-3 rounded-xl hover:bg-[#252a33] transition-colors"
          >
            Back to Home
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23] text-gray-200">
      <Header />
      <main className="flex-grow container mx-auto max-w-5xl px-6 py-8">
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
                  src={analysis.sourceDeal.imageUrl || "/placeholder.svg"}
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
                  <p className={`text-2xl font-bold ${getScoreColor(analysis.dealScore)}`}>{analysis.dealScore}/100</p>
                </div>

                <div className="glass-card p-4 rounded-xl border border-gray-800/30">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="text-green-500 mr-2" size={20} />
                    <h3 className="text-gray-400">Est. Net Profit</h3>
                  </div>
                  <p className={`text-2xl font-bold ${getProfitColor(analysis.estimatedNetProfit)}`}>
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

          {analysis.scoreBreakdown && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Score Breakdown
              </h2>
              <div className="glass-card p-6 rounded-xl border border-gray-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Percent className="text-indigo-500 mr-2" size={18} />
                          <span className="text-gray-200">Percentile Score</span>
                        </div>
                        <span className="font-bold">{analysis.scoreBreakdown.percentileScore}/15</span>
                      </div>
                      {renderScoreBar(analysis.scoreBreakdown.percentileScore, 15)}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <DollarSign className="text-green-500 mr-2" size={18} />
                          <span className="text-gray-200">Profit Score</span>
                        </div>
                        <span className="font-bold">{analysis.scoreBreakdown.profitScore}/25</span>
                      </div>
                      {renderScoreBar(analysis.scoreBreakdown.profitScore, 25)}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <BarChart className="text-blue-500 mr-2" size={18} />
                          <span className="text-gray-200">Market Score</span>
                        </div>
                        <span className="font-bold">{analysis.scoreBreakdown.marketScore}/20</span>
                      </div>
                      {renderScoreBar(analysis.scoreBreakdown.marketScore, 20)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <ShoppingCart className="text-purple-500 mr-2" size={18} />
                          <span className="text-gray-200">Deal Quality Score</span>
                        </div>
                        <span className="font-bold">{analysis.scoreBreakdown.dealQualityScore}/15</span>
                      </div>
                      {renderScoreBar(analysis.scoreBreakdown.dealQualityScore, 15)}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Droplets className="text-cyan-500 mr-2" size={18} />
                          <span className="text-gray-200">Liquidity Score</span>
                        </div>
                        <span className="font-bold">{analysis.scoreBreakdown.liquidityScore}/15</span>
                      </div>
                      {renderScoreBar(analysis.scoreBreakdown.liquidityScore, 15)}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Shield className="text-yellow-500 mr-2" size={18} />
                          <span className="text-gray-200">Risk Score</span>
                        </div>
                        <span className="font-bold">{analysis.scoreBreakdown.riskScore}/10</span>
                      </div>
                      {renderScoreBar(analysis.scoreBreakdown.riskScore, 10)}
                    </div>

                    <div className="glass-card p-4 rounded-xl border border-gray-800/30 bg-gray-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Award className="text-yellow-500 mr-2" size={18} />
                          <span className="text-gray-200">Total Score</span>
                        </div>
                        <span className={`font-bold text-xl ${getScoreColor(analysis.dealScore)}`}>
                          {analysis.dealScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysis.vintedStats && (
            <div>
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
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
      </main>
      <Footer />
    </div>
  );
}

export default DealDetails;