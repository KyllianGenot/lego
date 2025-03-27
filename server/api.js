const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const { analyzeProfitability } = require('./src/exec/executeAnalysis');

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
    console.log('GET /deals/search called with query:', request.query);

    const analyzesCollection = db.collection('analyzes');

    const limit = parseInt(request.query.limit) || 12;
    const price = parseFloat(request.query.price) || null;
    const date = request.query.date ? new Date(request.query.date) : null;
    const filterBy = request.query.filterBy || null;

    let query = {};
    if (price) {
      query['sourceDeal.price'] = { $lte: price };
    }
    if (date && !isNaN(date.getTime())) {
      query.timestamp = { $gte: date.toISOString() };
    }

    let sortCriteria = { 'sourceDeal.price': 1 };
    if (filterBy === 'best-discount') {
      sortCriteria = { dealScore: -1 };
    } else if (filterBy === 'most-commented') {
      sortCriteria = { 'sourceDeal.commentsCount': -1 };
    }

    const analyzes = await analyzesCollection.find(query).sort(sortCriteria).limit(limit).toArray();
    const total = await analyzesCollection.countDocuments(query);

    // Format the results to include nested sourceDeal
    const formattedResults = analyzes.map(analysis => ({
      _id: analysis._id.toString(),
      sourceDeal: {
        setNumber: analysis.sourceDeal.setNumber,
        title: analysis.sourceDeal.title,
        price: analysis.sourceDeal.price,
        temperature: analysis.sourceDeal.temperature,
        commentsCount: analysis.sourceDeal.commentsCount,
        link: analysis.sourceDeal.link,
        imageUrl: analysis.sourceDeal.imageUrl,
        retail: analysis.sourceDeal.retail || null,
        discount: analysis.sourceDeal.discount || null,
        postedDate: analysis.sourceDeal.postedDate
          ? Math.floor(new Date(analysis.sourceDeal.postedDate).getTime() / 1000)
          : null,
      },
      dealScore: analysis.dealScore,
      estimatedNetProfit: analysis.estimatedNetProfit,
      recommendation: analysis.recommendation,
    }));

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

    if (!ObjectId.isValid(dealId)) {
      return response.status(400).json({ error: 'Invalid deal ID' });
    }

    const analyzesCollection = db.collection('analyzes');

    const analysis = await analyzesCollection.findOne({ _id: new ObjectId(dealId) });

    if (!analysis) {
      return response.status(404).json({ error: 'Deal not found' });
    }

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

    const limit = parseInt(request.query.limit) || 12;
    const legoSetId = request.query.legoSetId || null;

    let query = {};
    if (legoSetId) {
      query.setNumber = legoSetId;
    }

    const sortCriteria = { postedDate: -1 };

    const sales = await salesCollection.find(query).sort(sortCriteria).limit(limit).toArray();
    const total = await salesCollection.countDocuments(query);

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

    const analysis = await analyzeProfitability(input);
    if (!analysis) {
      return response.status(404).json({ error: 'Analysis failed or no deal found' });
    }

    const analyzesCollection = db.collection('analyzes');
    const savedAnalysis = await analyzesCollection.findOne({ setNumber: analysis.sourceDeal.setNumber });

    response.json({
      _id: savedAnalysis._id.toString(),
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