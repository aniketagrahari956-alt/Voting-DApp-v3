import express from "express";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./src/backend/routes/api.js";
import { startEventSync } from "./src/backend/sync/eventSync.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json());

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/voting_dapp";
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
    // Start Event Sync worker
    startEventSync();
  } catch (err: any) {
    console.error("MongoDB connection error:", err.message);
    if (err.message && err.message.includes('IP that isn\'t whitelisted')) {
      console.error("\n============================================================");
      console.error("ACTION REQUIRED: IP Whitelist Error");
      console.error("This deployment environment uses dynamic IP addresses.");
      console.error("To fix this, go to your MongoDB Atlas dashboard:");
      console.error("1. Click 'Network Access' on the left sidebar.");
      console.error("2. Click 'Add IP Address'.");
      console.error("3. Click 'ALLOW ACCESS FROM ANYWHERE' (adds 0.0.0.0/0).");
      console.error("4. Confirm and wait for it to deploy.");
      console.error("============================================================\n");
    }
  }

  // API routes FIRST
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
