const path = require("path");

// Always load backend/.env (not cwd-dependent). `override: true` so values in .env win over
// stale Windows/user env vars (e.g. DATABASE_URL=paste_external_url_here from a bad global).
require("dotenv").config({
  path: path.join(__dirname, "../../.env"),
  override: true
});

const dbUrl = process.env.DATABASE_URL;
if (dbUrl && !/^postgres(ql)?:\/\//i.test(dbUrl.trim())) {
  throw new Error(
    "DATABASE_URL must be a full URL starting with postgresql:// (from Render → Postgres → Connections). " +
      "If you set DATABASE_URL in Windows Environment Variables to paste_external_url_here, remove or fix it — " +
      "it overrides backend/.env unless you use override in dotenv (already enabled)."
  );
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl,
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  redisUrl: process.env.REDIS_URL || "",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || ""
  }
};
