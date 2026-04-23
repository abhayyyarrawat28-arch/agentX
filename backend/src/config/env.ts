import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/canh-agency',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresInAgent: process.env.JWT_EXPIRES_IN_AGENT || '1h',
  jwtExpiresInAdmin: process.env.JWT_EXPIRES_IN_ADMIN || '6h',
  nodeEnv: process.env.NODE_ENV || 'development',
};
