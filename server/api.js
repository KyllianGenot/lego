const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

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

    const dealsCollection = db.collection('deals');

    // Extract and validate query parameters
    const limit = parseInt(request.query.limit) || 12; // Default to 12 if not provided or invalid
    const price = parseFloat(request.query.price) || null; // Convert to float, null if invalid
    const date = request.query.date ? new Date(request.query.date) : null; // Parse date, null if invalid
    const filterBy = request.query.filterBy || null; // Filter option, null if not provided

    // Build the MongoDB query
    let query = {};
    if (price) {
      query.price = { $lte: price }; // Deals with price less than or equal to the specified value
    }
    if (date && !isNaN(date.getTime())) { // Ensure date is valid
      query.postedDate = { $gte: date.toISOString() }; // Deals posted on or after the date
    }

    // Define sorting criteria
    let sortCriteria = { price: 1 }; // Default: sort by price ascending
    if (filterBy === 'best-discount') {
      sortCriteria = { temperature: -1 }; // Sort by temperature descending
    } else if (filterBy === 'most-commented') {
      sortCriteria = { commentsCount: -1 }; // Sort by comments count descending
    }

    // Execute the query
    const deals = await dealsCollection.find(query).sort(sortCriteria).limit(limit).toArray();
    const total = await dealsCollection.countDocuments(query);

    // Format the results
    const formattedResults = deals.map(deal => ({
      _id: deal._id.toString(),
      link: deal.link,
      retail: deal.retail || null,
      price: deal.price,
      discount: deal.discount || null,
      temperature: deal.temperature,
      photo: deal.imageUrl,
      comments: deal.commentsCount,
      published: deal.postedDate ? Math.floor(new Date(deal.postedDate).getTime() / 1000) : null,
      title: deal.title,
      id: deal.setNumber,
      community: 'dealabs',
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

    const dealsCollection = db.collection('deals');

    // Query the database with a valid ObjectId
    const deal = await dealsCollection.findOne({ _id: new ObjectId(dealId) });

    // If no deal is found, return a 404
    if (!deal) {
      return response.status(404).json({ error: 'Deal not found' });
    }

    // Format the response
    const formattedDeal = {
      _id: deal._id.toString(),
      link: deal.link,
      retail: deal.retail || null,
      price: deal.price,
      discount: deal.discount || null,
      temperature: deal.temperature,
      photo: deal.imageUrl,
      comments: deal.commentsCount,
      published: deal.postedDate ? Math.floor(new Date(deal.postedDate).getTime() / 1000) : null,
      title: deal.title,
      id: deal.setNumber,
      community: 'dealabs',
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