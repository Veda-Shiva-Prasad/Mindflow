require("dotenv").config();

const dns = require("node:dns");

// Only needed for mongodb+srv:// (Atlas) lookups on networks with flaky DNS.
if ((process.env.MONGO_URI || "").startsWith("mongodb+srv://")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Running behind nginx / a hosting proxy: trust one proxy hop so the rate
// limiter sees real client IPs instead of the proxy's IP.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "30kb" }));

app.use(
  "/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.use("/auth", require("./routes/auth"));
app.use("/api/journals", require("./routes/journal"));

app.get("/", (_req, res) => res.json({ name: "Mindflow API", status: "ok" }));

app.get("/health", (_req, res) =>
  res.json({
    status: "healthy",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);

// A clear JSON response makes missing/misspelled API routes easier to diagnose.
app.use((req, res) =>
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  }),
);

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mindflow database connected");

  app.listen(PORT, () => console.log(`Mindflow API listening on ${PORT}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = app;
