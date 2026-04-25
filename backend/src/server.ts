import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { warmAdminDashboardCache } from './modules/dashboard/controller';

async function start() {
  try {
    await mongoose.connect(env.mongoUri);
    logger.info('Connected to MongoDB');

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);

      const warm = async () => {
        try {
          await warmAdminDashboardCache();
          logger.info('Admin dashboard cache warmed');
        } catch (error) {
          logger.warn('Admin dashboard cache warm-up skipped', { error });
        }
      };

      void warm();
      setInterval(() => {
        void warm();
      }, 40 * 1000);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
