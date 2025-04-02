// Simple script to test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log(`Using URI: ${maskConnectionString(process.env.MONGO_URI)}`);
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('');
    console.log('===========================================================');
    console.log('✅ Connected to MongoDB successfully!');
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    console.log(`MongoDB Version: ${conn.version}`);
    console.log('===========================================================');
    console.log('');

    // Get a list of collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:');
    if (collections.length === 0) {
      console.log('No collections found (new database)');
    } else {
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('');
    console.log('Connection closed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('===========================================================');
    console.error('❌ Error connecting to MongoDB:');
    console.error(error.message);
    console.error('===========================================================');
    console.error('');
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('This could be due to:');
      console.error('1. Network connectivity issues');
      console.error('2. MongoDB Atlas IP whitelist restrictions');
      console.error('3. Incorrect credentials in your connection string');
      console.error('');
      console.error('Make sure your connection string in .env is correct.');
    }
    
    process.exit(1);
  }
};

// Helper function to mask the password in the connection string for secure logging
function maskConnectionString(uri) {
  if (!uri) return 'No connection string found. Please check your .env file.';
  
  try {
    // Check if it's a MongoDB Atlas URI
    if (uri.includes('@')) {
      // Format: mongodb+srv://username:password@cluster
      const parts = uri.split('@');
      const credentials = parts[0].split('://')[1].split(':');
      const username = credentials[0];
      
      // Replace the password with asterisks
      return `${uri.split('://')[0]}://${username}:******@${parts[1]}`;
    }
    
    return uri;
  } catch (err) {
    return 'Invalid connection string format';
  }
}

// Run the test
testConnection();