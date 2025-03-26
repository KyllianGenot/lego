const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const { analyzeProfitability } = require('./src/exec/executeAnalysis'); // Import the analyzeProfitability function

const PORT = 8092;

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

const app = express();

module.exports = app;

app.use(require('body-parser').json());
app.use(cors());
app.use(helmet());

app.options('*', cors());

// MongoDB client setup
let client;
let db;

(async () => {
  try {
    client = await MongoClient.connect(MONGODB_URI);
    db = client.db(MONGODB_DB_NAME);
    console.log('📦 Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`📡 Running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('📦 MongoDB connection closed');
  }
  process.exit(0);
});

// Test endpoint
app.get('/', (request, response) => {
  response.send({ 'ack': true });
});

// GET /deals/search - Search deals with optional query parameters
app.get('/deals/search', async (request, response) => {
  try {
    // Log to confirm endpoint is hit
    console.log('GET /deals/search called with query:', request.query);

    const analyzesCollection = db.collection('analyzes'); // Use the analyzes collection

    // Extract and validate query parameters
    const limit = parseInt(request.query.limit) || 12; // Default to 12 if not provided or invalid
    const price = parseFloat(request.query.price) || null; // Convert to float, null if invalid
    const date = request.query.date ? new Date(request.query.date) : null; // Parse date, null if invalid
    const filterBy = request.query.filterBy || null; // Filter option, null if not provided

    // Build the MongoDB query
    let query = {};
    if (price) {
      query['sourceDeal.price'] = { $lte: price }; // Deals with price less than or equal to the specified value
    }
    if (date && !isNaN(date.getTime())) { // Ensure date is valid
      query.timestamp = { $gte: date.toISOString() }; // Analysis posted on or after the date
    }

    // Define sorting criteria
    let sortCriteria = { 'sourceDeal.price': 1 }; // Default: sort by price ascending
    if (filterBy === 'best-discount') {
      sortCriteria = { dealScore: -1 }; // Sort by deal score descending
    } else if (filterBy === 'most-commented') {
      sortCriteria = { 'sourceDeal.commentsCount': -1 }; // Sort by comments count descending
    }

    // Execute the query
    const analyzes = await analyzesCollection.find(query).sort(sortCriteria).limit(limit).toArray();
    const total = await analyzesCollection.countDocuments(query);

    // Format the results to include analysis data
    const formattedResults = analyzes.map(analysis => ({
      _id: analysis._id.toString(),
      link: analysis.sourceDeal.link,
      retail: analysis.sourceDeal.retail || null,
      price: analysis.sourceDeal.price,
      discount: analysis.sourceDeal.discount || null,
      temperature: analysis.sourceDeal.temperature,
      photo: analysis.sourceDeal.imageUrl,
      comments: analysis.sourceDeal.commentsCount,
      published: analysis.sourceDeal.postedDate ? Math.floor(new Date(analysis.sourceDeal.postedDate).getTime() / 1000) : null,
      title: analysis.sourceDeal.title,
      id: analysis.sourceDeal.setNumber,
      community: 'dealabs',
      dealScore: analysis.dealScore,              // Include deal score
      estimatedNetProfit: analysis.estimatedNetProfit, // Include estimated net profit
      recommendation: analysis.recommendation,    // Include recommendation
    }));

    // Send the response
    response.json({
      limit,
      total,
      results: formattedResults,
    });
  } catch (error) {
    console.error('Error in GET /deals/search:', error.message);
    response.status(500).json({ error: 'Internal server error' });
  }
});

// GET /deals/:id - Fetch a specific deal by ID
app.get('/deals/:id', async (request, response) => {
  try {
    const dealId = request.params.id;

    // Validate the dealId to ensure it’s a valid ObjectId
    if (!ObjectId.isValid(dealId)) {
      return response.status(400).json({ error: 'Invalid deal ID' });
    }

    const analyzesCollection = db.collection('analyzes'); // Use the analyzes collection

    // Query the database with a valid ObjectId
    const analysis = await analyzesCollection.findOne({ _id: new ObjectId(dealId) });

    // If no analysis is found, return a 404
    if (!analysis) {
      return response.status(404).json({ error: 'Deal not found' });
    }

    // Format the response to include the full analysis data
    const formattedDeal = {
      _id: analysis._id.toString(),
      sourceDeal: {
        setNumber: analysis.sourceDeal.setNumber,
        title: analysis.sourceDeal.title,
        price: analysis.sourceDeal.price,
        temperature: analysis.sourceDeal.temperature,
        commentsCount: analysis.sourceDeal.commentsCount,
        link: analysis.sourceDeal.link,
        imageUrl: analysis.sourceDeal.imageUrl,
      },
      dealScore: analysis.dealScore,
      estimatedNetProfit: analysis.estimatedNetProfit,
      recommendation: analysis.recommendation,
      vintedStats: {
        averageSellingPrice: analysis.averageSellingPrice,
        medianSellingPrice: analysis.medianSellingPrice,
        priceRange: `${analysis.lowerQuartilePrice}€ - ${analysis.upperQuartilePrice}€`,
        priceStability: analysis.coefficientOfVariation,
        averageCondition: analysis.averageCondition,
        averageFavorites: analysis.averageFavorites,
        listingsCount: analysis.newConditionListingsCount,
      },
    };

    response.json(formattedDeal);
  } catch (error) {
    console.error('Error fetching deal:', error.message);
    response.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sales/search - Search sales with optional query parameters
app.get('/sales/search', async (request, response) => {
  try {
    const salesCollection = db.collection('sales');

    // Extract query parameters
    const limit = parseInt(request.query.limit) || 12;
    const legoSetId = request.query.legoSetId || null;

    // Build the query
    let query = {};
    if (legoSetId) {
      query.setNumber = legoSetId;
    }

    // Sort by date descending
    const sortCriteria = { postedDate: -1 };

    // Fetch sales
    const sales = await salesCollection.find(query).sort(sortCriteria).limit(limit).toArray();
    const total = await salesCollection.countDocuments(query);

    // Format the response
    const formattedResults = sales.map(sale => ({
      _id: sale._id.toString(),
      link: sale.link,
      price: sale.price,
      title: sale.title,
      published: sale.postedDate ? Math.floor(new Date(sale.postedDate).getTime() / 1000) : null,
    }));

    response.json({
      limit,
      total,
      results: formattedResults,
    });
  } catch (error) {
    console.error('Error searching sales:', error.message);
    response.status(500).json({ error: 'Internal server error' });
  }
});

// POST /analyze - Trigger profitability analysis for a given input (Dealabs link or set ID)
app.post('/analyze', async (request, response) => {
  try {
    const { input } = request.body;
    if (!input) {
      return response.status(400).json({ error: 'Input is required' });
    }

    // Trigger the profitability analysis (this will scrape and store data in MongoDB)
    const analysis = await analyzeProfitability(input);
    if (!analysis) {
      return response.status(404).json({ error: 'Analysis failed or no deal found' });
    }

    // Fetch the _id of the saved analysis
    const analyzesCollection = db.collection('analyzes');
    const savedAnalysis = await analyzesCollection.findOne({ setNumber: analysis.sourceDeal.setNumber });

    // Format the response to match what the frontend expects
    response.json({
      _id: savedAnalysis._id.toString(), // Include the _id
      sourceDeal: {
        setNumber: analysis.sourceDeal.setNumber,
        title: analysis.sourceDeal.title,
        price: analysis.sourceDeal.price,
        temperature: analysis.sourceDeal.temperature,
        commentsCount: analysis.sourceDeal.commentsCount,
        link: analysis.sourceDeal.link,
      },
      dealScore: analysis.dealScore,
      estimatedNetProfit: analysis.estimatedNetProfit,
      recommendation: analysis.recommendation,
      vintedStats: {
        averageSellingPrice: analysis.averageSellingPrice,
        medianSellingPrice: analysis.medianSellingPrice,
        priceRange: `${analysis.lowerQuartilePrice}€ - ${analysis.upperQuartilePrice}€`,
        priceStability: analysis.coefficientOfVariation,
        averageCondition: analysis.averageCondition,
        averageFavorites: analysis.averageFavorites,
        listingsCount: analysis.newConditionListingsCount,
      },
    });
  } catch (error) {
    console.error('Error in POST /analyze:', error.message);
    response.status(500).json({ error: 'Internal server error' });
  }
});