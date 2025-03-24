const { MongoClient } = require('mongodb');
const { analyzeProfitability } = require('../analysis/analyzer');
require('dotenv').config(); // Load environment variables

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// Function to implement the 6 query methods for deals
async function queryDeals(collection) {
  try {
    // 1. Find all best discount deals (highest temperature)
    const bestDiscountDeals = await collection
      .find({ temperature: { $gt: 0 } })
      .sort({ temperature: -1 })
      .limit(10)
      .toArray();

    // 2. Find all most commented deals
    const mostCommentedDeals = await collection
      .find({ commentsCount: { $gt: 0 } })
      .sort({ commentsCount: -1 })
      .limit(10)
      .toArray();

    // 3. Find all deals sorted by price
    const dealsByPrice = await collection
      .find()
      .sort({ price: 1 })
      .toArray();

    // 4. Find all deals sorted by date
    const dealsByDate = await collection
      .find()
      .sort({ postedDate: -1 })
      .toArray();
    // 5. Find all deals for a given LEGO set ID
    const legoSetId = '40460'; // Example set number
    const dealsBySetId = await collection
      .find({ setNumber: legoSetId })
      .toArray();

    // 6. Find all deals posted less than 3 weeks ago
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const recentDeals = await collection
      .find({ postedDate: { $gte: threeWeeksAgo.toISOString() } })
      .toArray();
  } catch (error) {
    console.error('Error querying deals:', error);
    throw error;
  }
}

// Function to implement the 6 query methods for sales
async function querySales(collection) {
  try {
    // 1. Find all sales with the best condition (highest condition value)
    const bestConditionSales = await collection
      .find({ condition: { $gte: 1 } })
      .sort({ condition: -1 })
      .limit(10)
      .toArray();

    // 2. Find all most favorited sales
    const mostFavoritedSales = await collection
      .find({ favoritesCount: { $gt: 0 } })
      .sort({ favoritesCount: -1 })
      .limit(10)
      .toArray();

    // 3. Find all sales sorted by price
    const salesByPrice = await collection
      .find()
      .sort({ price: 1 })
      .toArray();

    // 4. Find all sales for a given LEGO set ID
    const legoSetId = '40460'; // Example set number
    const salesBySetId = await collection
      .find({ setNumber: legoSetId })
      .toArray();

    // 5. Find all sales with price below a certain threshold
    const affordableSales = await collection
      .find({ price: { $lt: 10 } })
      .toArray();

    // 6. Find all sales with more than a certain number of favorites
    const popularSales = await collection
      .find({ favoritesCount: { $gte: 10 } })
      .toArray();
  } catch (error) {
    console.error('Error querying sales:', error);
    throw error;
  }
}

// Main execution
(async () => {
  let client;
  try {
    // Connect to MongoDB - remove deprecated options
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_DB_NAME);
    const dealsCollection = db.collection('deals');
    const salesCollection = db.collection('sales');

    // Run the analysis
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const input = args[0];
      await analyzeProfitability(input);
    } else {
      console.log('Please provide a URL from dealabs.com or a LEGO set name');
      console.log('Example: node src/exec/executeAnalysis.js "https://www.dealabs.com/bons-plans/lego-classic-la-boite-creative-du-bonheur-11042-3017948"');
      console.log('Example: node src/exec/executeAnalysis.js "11042"');
      process.exit(1);
    }

    // Query the deals and sales (commenting out for now to focus on the scraping issue)
    // await queryDeals(dealsCollection);
    // await querySales(salesCollection);
  } catch (error) {
    console.error('Error during execution:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
})();