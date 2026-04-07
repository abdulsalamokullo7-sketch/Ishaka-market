const { Pool } = require("pg");
const env = require("../config/env");

// Render/Neon/etc. require TLS even when NODE_ENV is development (e.g. npm run seed from your PC).
const isRemoteDb =
  env.dbUrl && !/localhost|127\.0\.0\.1/.test(env.dbUrl);
const useSsl = Boolean(isRemoteDb);

const pool = new Pool({
  connectionString: env.dbUrl,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
});

module.exports = pool;
