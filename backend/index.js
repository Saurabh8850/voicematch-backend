process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

dotenv.config();

function safeRequire(label, modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    console.error(`[startup] Failed to load ${label} (${modulePath}):`, error.message);
    console.error(error.stack);
    throw error;
  }
}

let authRoutes;
let userRoutes;
let swipeRoutes;
let matchRoutes;
let messageRoutes;
let callRoutes;
let aiRoutes;
let paymentRoutes;
let adminRoutes;
let roomsRoutes;

try {
  console.log("[startup] Loading route modules...");
  authRoutes = safeRequire("auth", "./routes/auth");
  userRoutes = safeRequire("users", "./routes/users");
  swipeRoutes = safeRequire("swipes", "./routes/swipes");
  matchRoutes = safeRequire("matches", "./routes/matches");
  messageRoutes = safeRequire("messages", "./routes/messages");
  callRoutes = safeRequire("calls", "./routes/calls");
  aiRoutes = safeRequire("ai", "./routes/ai");
  paymentRoutes = safeRequire("payments", "./routes/payments");
  adminRoutes = safeRequire("admin", "./routes/admin");
  roomsRoutes = safeRequire("rooms", "./routes/rooms");
  console.log("[startup] All route modules loaded");
} catch (error) {
  console.error("[startup] Server failed to start due to module load error");
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "VoiceMatch backend is healthy" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/swipes", swipeRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/calls", callRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/rooms", roomsRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(`VoiceMatch backend running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`[startup] Port ${port} is already in use. Stop the other process or change PORT in .env`);
  } else {
    console.error("[startup] Server error:", error);
  }
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("[shutdown] SIGINT received, closing server...");
  server.close(() => {
    console.log("[shutdown] Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("[shutdown] SIGTERM received, closing server...");
  server.close(() => {
    console.log("[shutdown] Server closed");
    process.exit(0);
  });
});
