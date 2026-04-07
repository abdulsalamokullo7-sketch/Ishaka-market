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
  "http://localhost:3000"
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 400 }));

app.get("/health", (_, res) => res.json({ ok: true, service: "ishaka-market-backend" }));
app.use("/api/v1", routes);

app.use((err, _, res, __) => {
  return res.status(500).json({ message: err.message || "Internal server error" });
});

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on port ${env.port}`);
});
