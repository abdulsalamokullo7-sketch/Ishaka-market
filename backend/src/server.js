const express = require("express");
require("express-async-errors");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const routes = require("./routes");

const app = express();

const corsAllowedOrigins = [
  "https://ishaka-market.vercel.app",
  env.frontendOrigin,
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]
  .filter(Boolean)
  .map((o) => o.replace(/\/$/, ""));

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (corsAllowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

// CORS must run before helmet so preflight and API responses always get Access-Control-* headers.
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    skip: (req) => req.method === "OPTIONS"
  })
);

app.get("/", (_, res) =>
  res.json({
    ok: true,
    service: "ishaka-market-backend",
    message: "API is running. Use /health or /api/v1/...",
    health: "/health",
    api: "/api/v1"
  })
);
app.get("/health", (_, res) => res.json({ ok: true, service: "ishaka-market-backend" }));
app.use("/api/v1", routes);

function mapErrorToResponse(err) {
  const code = err && err.code;
  if (code === "42P01") {
    return {
      status: 503,
      body: {
        message:
          'Tables are missing. On Render: Web Service → Shell → run: npm run seed (applies schema + sample data).',
        code
      }
    };
  }
  if (code === "3D000") {
    return {
      status: 503,
      body: { message: "Database name in DATABASE_URL does not exist.", code }
    };
  }
  if (code === "28P01" || code === "28000") {
    return {
      status: 503,
      body: { message: "Database login failed. Copy Internal DATABASE_URL from Render Postgres → your web service env.", code }
    };
  }
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
    return {
      status: 503,
      body: { message: "Cannot reach database host. Check DATABASE_URL and that Postgres is running.", code }
    };
  }
  const status = err.statusCode || err.status;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  return {
    status: safeStatus,
    body: {
      message: err.message || "Internal server error",
      ...(code ? { code } : {})
    }
  };
}

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const mapped = mapErrorToResponse(err);
  return res.status(mapped.status).json(mapped.body);
});

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on port ${env.port}`);
  if (!env.dbUrl) {
    // eslint-disable-next-line no-console
    console.warn("[WARN] DATABASE_URL is not set — API routes that use Postgres will fail.");
  }
});
