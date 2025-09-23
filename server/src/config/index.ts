export const appConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
};

export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey', // 실제 운영에서는 반드시 환경변수로 설정
  },
  vercel: {
    clientId: process.env.VERCEL_CLIENT_ID || '',
    clientSecret: process.env.VERCEL_CLIENT_SECRET || '',
    redirectUri: process.env.VERCEL_REDIRECT_URI || 'http://localhost:3001/api/vercel/callback',
    encryptionKey: process.env.VERCEL_ENCRYPTION_KEY || '',
  },
  // 다른 설정들도 여기에 추가될 수 있습니다.
};
