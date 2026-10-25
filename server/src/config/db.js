const mongoose = require('mongoose');

let memoryServerInstance = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log('🔄 [Database] Connecting to MongoDB configured at MONGODB_URI...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ [Database] Connected successfully to MongoDB:', mongoose.connection.host);
      return;
    } catch (err) {
      console.warn(`⚠️ [Database] Failed to connect to specified MONGODB_URI (${err.message}).`);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      console.log('🔄 [Database] Falling back to embedded MongoDB Memory Server for seamless local execution...');
    }
  } else {
    console.log('ℹ️ [Database] No MONGODB_URI specified in .env. Initializing embedded in-memory MongoDB...');
  }

  // Fallback to in-memory MongoDB for easy testing and local development
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create();
    const memUri = memoryServerInstance.getUri();
    await mongoose.connect(memUri);
    console.log('✅ [Database] In-memory MongoDB connected successfully at:', memUri);
  } catch (memErr) {
    console.error('❌ [Database] Failed to start MongoDB connection:', memErr.message);
    throw memErr;
  }
}

async function closeDB() {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
  } catch (err) {
    console.error('Error closing database connection:', err);
  }
}

module.exports = { connectDB, closeDB };
