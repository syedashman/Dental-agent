/**
 * MongoDB connection configuration with retry logic
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  };

  let retries = 5;

  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, options);
      logger.info(`MongoDB connected: ${mongoose.connection.host}`);

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting reconnect...');
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB error:', err);
      });

      return;
    } catch (error) {
      retries -= 1;
      logger.error(`MongoDB connection failed. Retries left: ${retries}`, error.message);
      if (retries === 0) throw error;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
};

module.exports = connectDB;
