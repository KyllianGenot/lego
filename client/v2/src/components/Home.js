import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeDeal, getTopDeals } from '../api';
import { Search, TrendingUp, Award, ArrowRight } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';

function Home() {
  const [input, setInput] = useState('');
  const [topDeals, setTopDeals] = useState({ topByDealScore: [], topByProfit: [] });
  const [loading, setLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopDeals = async () => {
      setLoading(true);
      try {
        const data = await getTopDeals();
        setTopDeals(data);
      } catch (error) {
        console.error('Error fetching top deals:', error);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };
    fetchTopDeals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setAnalyzeLoading(true);
    try {
      const analysis = await analyzeDeal(input);
      if (analysis && analysis._id) {
        navigate(`/deal/${analysis._id}`);
      } else {
        alert('No analysis found for the given input');
      }
    } catch (error) {
      alert('Error analyzing deal: ' + error.message);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23] text-gray-200">
      <Header />
      <main className="flex-grow container mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-20">
          <h2 className="text-6xl font-bold mb-6 leading-tight">
            Find the Best <span className="gradient-text">LEGO Deals</span>
          </h2>
          <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto">
            Enter a LEGO set ID or Dealabs link to analyze profitability and market trends
          </p>
          
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter LEGO set ID or Dealabs link"
                className="w-full h-16 bg-[#1a1d23]/50 backdrop-blur border border-gray-700/50 rounded-2xl py-4 px-5 pl-14 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                disabled={analyzeLoading}
              />
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            </div>
            <button
              type="submit"
              className="mt-4 w-full h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center"
              disabled={analyzeLoading}
            >
              {analyzeLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : (
                'Analyze Deal'
              )}
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card rounded-2xl p-8 border border-gray-800/50">
              <div className="flex items-center mb-8">
                <Award className="text-yellow-500 mr-3" size={28} />
                <h2 className="text-2xl font-bold gradient-text">
                  Top Deals by Score
                </h2>
              </div>
              
              {!initialLoadComplete ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : topDeals.topByDealScore.length === 0 ? (
                <p className="text-gray-500">No deals available.</p>
              ) : (
                <div className="space-y-4">
                  {topDeals.topByDealScore.map((deal, index) => (
                    <div 
                      key={index} 
                      className="deal-card bg-[#252a33]/50 backdrop-blur p-4 rounded-xl hover:bg-[#2a303a]/50 cursor-pointer border border-gray-700/30"
                      onClick={() => navigate(`/deal/${deal._id}`)}
                    >
                      <div className="flex items-center space-x-4">
                        {deal.sourceDeal?.imageUrl && (
                          <img 
                            src={deal.sourceDeal.imageUrl} 
                            alt={deal.sourceDeal?.title} 
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-white mb-2 line-clamp-1">
                            {deal.sourceDeal?.title || 'Unknown Title'} 
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            Set: {deal.sourceDeal?.setNumber || deal.id || 'N/A'}
                          </p>
                          <div className="flex justify-between items-center">
                            <p className="text-blue-400 font-medium">
                              {deal.sourceDeal?.price != null ? `${deal.sourceDeal.price.toFixed(2)}€` : 'N/A'}
                            </p>
                            <div className="flex items-center">
                              <span className="text-yellow-500 font-bold mr-1">{deal.dealScore || 'N/A'}</span>
                              <span className="text-gray-500">/100</span>
                              <ArrowRight className="ml-2 text-gray-500" size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="glass-card rounded-2xl p-8 border border-gray-800/50">
              <div className="flex items-center mb-8">
                <TrendingUp className="text-green-500 mr-3" size={28} />
                <h2 className="text-2xl font-bold gradient-text">
                  Top Deals by Profit
                </h2>
              </div>
              
              {!initialLoadComplete ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : topDeals.topByProfit.length === 0 ? (
                <p className="text-gray-500">No deals available.</p>
              ) : (
                <div className="space-y-4">
                  {topDeals.topByProfit.map((deal, index) => (
                    <div 
                      key={index} 
                      className="deal-card bg-[#252a33]/50 backdrop-blur p-4 rounded-xl hover:bg-[#2a303a]/50 cursor-pointer border border-gray-700/30"
                      onClick={() => navigate(`/deal/${deal._id}`)}
                    >
                      <div className="flex items-center space-x-4">
                        {deal.sourceDeal?.imageUrl && (
                          <img 
                            src={deal.sourceDeal.imageUrl} 
                            alt={deal.sourceDeal?.title} 
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-white mb-2 line-clamp-1">
                            {deal.sourceDeal?.title || 'Unknown Title'} 
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            Set: {deal.sourceDeal?.setNumber || deal.id || 'N/A'}
                          </p>
                          <div className="flex justify-between items-center">
                            <p className="text-blue-400 font-medium">
                              {deal.sourceDeal?.price != null ? `${deal.sourceDeal.price.toFixed(2)}€` : 'N/A'}
                            </p>
                            <div className="flex items-center">
                              <span className={`font-bold mr-1 ${deal.estimatedNetProfit != null ? (deal.estimatedNetProfit >= 0 ? "text-green-500" : "text-red-500") : "text-gray-500"}`}>
                                {deal.estimatedNetProfit != null ? 
                                  (deal.estimatedNetProfit >= 0 ? `+${deal.estimatedNetProfit.toFixed(2)}€` : `${deal.estimatedNetProfit.toFixed(2)}€`) 
                                  : 'N/A'}
                              </span>
                              <ArrowRight className="ml-2 text-gray-500" size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default Home;