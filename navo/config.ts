import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
}

export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  port: process.env.PORT || 3000,
  api: {
    baseUrl: process.env.API_BASE_URL || '',
  },
  jwt: {
    secret: jwtSecret,
  },
  featureFlags: {
    // example flag
    enableNewFeature: process.env.ENABLE_NEW_FEATURE === 'true',
  },
};
