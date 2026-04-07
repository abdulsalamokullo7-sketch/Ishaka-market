const { Pool } = require("pg");
const env = require("../config/env");

const pool = new Pool({
  connectionString: env.dbUrl
});

module.exports = pool;
