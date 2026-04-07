const { Pool } = require("pg");
const env = require("../config/env");

const isProd = env.nodeEnv === "production";
const useSsl =
  isProd &&
  env.dbUrl &&
  (env.dbUrl.includes("render.com") ||
    env.dbUrl.includes("sslmode=require") ||
    env.dbUrl.includes("neon.tech") ||
    env.dbUrl.includes("supabase"));

const pool = new Pool({
  connectionString: env.dbUrl,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
});

module.exports = pool;
