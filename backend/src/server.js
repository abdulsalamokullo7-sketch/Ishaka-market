const express = require("express");
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

app.use((err, _, res, __) => {
  return res.status(500).json({ message: err.message || "Internal server error" });
});

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on port ${env.port}`);
});
