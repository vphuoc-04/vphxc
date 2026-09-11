export default () => ({
  port: parseInt(process.env.PORT as string, 10),
  nodeEnv: process.env.NODE_ENV,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT as string, 10),
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    charset: process.env.DB_CHARSET,
    collation: process.env.DB_COLLATION,
    timezone: process.env.DB_TIMEZONE,
    poolLimit: parseInt(process.env.DB_POOL_LIMIT as string, 10),
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT as string, 10),
    connectionTimeout: parseInt(
      process.env.DB_CONNECTION_TIMEOUT as string,
      10,
    ),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT as string, 10),
    enableMultipleStatements:
      process.env.DB_ENABLE_MULTIPLE_STATEMENTS === 'true',
  },
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS as string)
      .split(',')
      .map((o) => o.trim()),
  },
  jwt: {
    secretKey:
      process.env.JWT_SECRET_KEY ||
      'default-secret-key-change-it-in-production',
    accessTokenExpirationMinutes: parseInt(
      process.env.JWT_ACCESS_TOKEN_EXPIRATION_MINUTES || '15',
      10,
    ),
    refreshTokenExpirationDays: parseInt(
      process.env.JWT_REFRESH_TOKEN_EXPIRATION_DAYS || '30',
      10,
    ),
    cookieName: process.env.JWT_COOKIE_NAME || 'refreshToken',
    cookieSecure: process.env.JWT_COOKIE_SECURE === 'true',
    cookieSameSite:
      (process.env.JWT_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
  },
});
