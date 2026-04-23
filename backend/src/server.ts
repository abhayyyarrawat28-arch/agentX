import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

async function start() {
  try {
    await mongoose.connect(env.mongoUri);
    logger.info('Connected to MongoDB');

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
