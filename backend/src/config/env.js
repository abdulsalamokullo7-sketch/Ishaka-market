const path = require("path");

// Always load backend/.env (not cwd-dependent). `override: true` so values in .env win over
// stale Windows/user env vars (e.g. DATABASE_URL=paste_external_url_here from a bad global).
require("dotenv").config({
  path: path.join(__dirname, "../../.env"),
  override: true
});

function normalizeDatabaseUrl(raw) {
  if (!raw) return "";
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

let dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (dbUrl) {
  process.env.DATABASE_URL = dbUrl;
}
if (dbUrl && !/^postgres(ql)?:\/\//i.test(dbUrl)) {
  throw new Error(
    "DATABASE_URL must start with postgresql:// or postgres:// (one line, no spaces before the URL). " +
      "Copy it from Render → PostgreSQL → Connections. Remove any Windows env var DATABASE_URL that is still a placeholder."
  );
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl,
  adminBootstrapKey: process.env.ADMIN_BOOTSTRAP_KEY || "",
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  redisUrl: process.env.REDIS_URL || "",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || ""
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || ""
  }
};
