import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';

function ScoreExplanation() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0e1116] to-[#1a1d23] text-gray-200">
      <Header />
      <main className="flex-grow container mx-auto max-w-4xl px-6 py-12">
        <Link
          to="/"
          className="flex items-center text-gray-400 hover:text-white mb-12 transition-colors"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8 gradient-text">
          How the Deal Score is Calculated
        </h1>

        <div className="glass-card rounded-2xl p-8 border border-gray-800/50">
          <p className="text-gray-400 mb-6">
            The LEGO Deal Analyzer uses a 100-point scoring system to evaluate LEGO deals, with a strong emphasis on the percentile rank of the Dealabs price compared to Vinted sales prices. The score comprises six components:
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">Score Breakdown</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">1. Percentile Score (15 points)</h3>
              <p className="text-gray-400">
                Measures how the Dealabs price ranks among Vinted sales prices. Lower percentiles indicate a better deal:
              </p>
              <ul className="list-disc list-inside text-gray-400 mt-2">
                <li>≤ 5th percentile: 15 points (exceptional deal)</li>
                <li>≤ 10th percentile: 12 points</li>
                <li>≤ 20th percentile: 9 points</li>
                <li>≤ 30th percentile: 6 points</li>
                <li>≤ 40th percentile: 3 points</li>
                <li>{'>'} 40th percentile: 0 points</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">2. Profit Score (25 points)</h3>
              <p className="text-gray-400">
                Assesses financial return based on net profit and ROI:
              </p>
              <ul className="list-disc list-inside text-gray-400 mt-2">
                <li>
                  <strong>Net Profit (15 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 30€: 15 points</li>
                    <li>≥ 20€: 12 points</li>
                    <li>≥ 10€: 8 points</li>
                    <li>≥ 5€: 4 points</li>
                    <li>0€ to 5€: 2 points</li>
                    <li>≤ 0€: 0 points</li>
                  </ul>
                </li>
                <li>
                  <strong>ROI (10 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 100%: 10 points</li>
                    <li>≥ 50%: 8 points</li>
                    <li>≥ 30%: 6 points</li>
                    <li>≥ 20%: 4 points</li>
                    <li>≥ 10%: 2 points</li>
                    <li>0% to 10%: 0 points</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">3. Market Score (20 points)</h3>
              <p className="text-gray-400">
                Evaluates Vinted market conditions:
              </p>
              <ul className="list-disc list-inside text-gray-400 mt-2">
                <li>
                  <strong>Number of Listings (8 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 15: 8 points</li>
                    <li>≥ 10: 6 points</li>
                    <li>≥ 5: 4 points</li>
                    <li>≥ 3: 2 points</li>
                    <li>1-2: 1 point</li>
                  </ul>
                </li>
                <li>
                  <strong>Price Stability (8 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≤ 10%: 8 points</li>
                    <li>≤ 15%: 6 points</li>
                    <li>≤ 20%: 4 points</li>
                    <li>≤ 30%: 2 points</li>
                    <li>≤ 40%: 1 point</li>
                  </ul>
                </li>
                <li>
                  <strong>Price Trend (4 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 1.3x: 4 points</li>
                    <li>≥ 1.2x: 3 points</li>
                    <li>≥ 1.1x: 2 points</li>
                    <li>≥ 1.05x: 1 point</li>
                    <li>Otherwise: 0 points</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">4. Deal Quality Score (15 points)</h3>
              <p className="text-gray-400">
                Assesses deal popularity and freshness:
              </p>
              <ul className="list-disc list-inside text-gray-400 mt-2">
                <li>
                  <strong>Deal Temperature (7 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 500: 7 points</li>
                    <li>≥ 300: 5 points</li>
                    <li>≥ 200: 4 points</li>
                    <li>≥ 100: 3 points</li>
                    <li>≥ 50: 2 points</li>
                    <li>{'<'} 50: 0 points</li>
                  </ul>
                </li>
                <li>
                  <strong>Comments Count (4 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 20: 4 points</li>
                    <li>≥ 10: 3 points</li>
                    <li>≥ 5: 2 points</li>
                    <li>≥ 2: 1 point</li>
                    <li>{'<'} 2: 0 points</li>
                  </ul>
                </li>
                <li>
                  <strong>Deal Freshness (4 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≤ 1 day: 4 points</li>
                    <li>≤ 2 days: 3 points</li>
                    <li>≤ 7 days: 2 points</li>
                    <li>≤ 14 days: 1 point</li>
                    <li>{'>'} 14 days: 0 points</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">5. Liquidity Score (15 points)</h3>
              <p className="text-gray-400">
                Measures ease of resale on Vinted:
              </p>
              <ul className="list-disc list-inside text-gray-400 mt-2">
                <li>
                  <strong>Average Favorites (8 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 15: 8 points</li>
                    <li>≥ 10: 6 points</li>
                    <li>≥ 5: 4 points</li>
                    <li>≥ 2: 2 points</li>
                    <li>Otherwise: 1 point</li>
                  </ul>
                </li>
                <li>
                  <strong>Average Condition (7 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≤ 1.2: 7 points</li>
                    <li>≤ 1.5: 6 points</li>
                    <li>≤ 1.8: 5 points</li>
                    <li>Otherwise: 4 points</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-blue-400">6. Risk Score (10 points)</h3>
              <p className="text-gray-400">
                Evaluates investment risk:
              </p>
              <ul className="list-disc list-inside text-gray-400 mt-2">
                <li>
                  <strong>Price-to-Minimum Ratio (5 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≥ 1.5x: 5 points</li>
                    <li>≥ 1.3x: 4 points</li>
                    <li>≥ 1.2x: 3 points</li>
                    <li>≥ 1.1x: 2 points</li>
                    <li>Otherwise: 1 point</li>
                  </ul>
                </li>
                <li>
                  <strong>Investment Size (5 points)</strong>:
                  <ul className="list-circle list-inside ml-4 mt-1">
                    <li>≤ 20€: 5 points</li>
                    <li>≤ 50€: 4 points</li>
                    <li>≤ 100€: 3 points</li>
                    <li>≤ 200€: 2 points</li>
                    <li>Otherwise: 1 point</li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Recommendation</h2>
          <p className="text-gray-400">
            Recommendations are based on the total score:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-2">
            <li>≥ 80: Strongly Buy - Excellent opportunity!</li>
            <li>≥ 70: Buy - Very good opportunity</li>
            <li>≥ 60: Consider Buying - Good potential</li>
            <li>≥ 50: Watch - Decent potential but some concerns</li>
            <li>≥ 40: Proceed with Caution - Marginal opportunity</li>
            <li>0-39: Avoid - Poor investment opportunity</li>
            <li>If not profitable: Avoid - Not profitable after shipping costs</li>
          </ul>

          <p className="text-gray-400 mt-6">
            This system emphasizes the percentile rank, rewarding deals where the Dealabs price is significantly lower than Vinted sales prices, while balancing other key factors.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ScoreExplanation;