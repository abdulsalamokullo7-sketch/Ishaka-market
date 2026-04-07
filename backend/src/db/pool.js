const { Pool } = require("pg");
const env = require("../config/env");

const isProd = env.nodeEnv === "production";
const isRemoteDb =
  env.dbUrl && !/localhost|127\.0\.0\.1/.test(env.dbUrl);
const useSsl = isProd && isRemoteDb;

const pool = new Pool({
  connectionString: env.dbUrl,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
});

module.exports = pool;
