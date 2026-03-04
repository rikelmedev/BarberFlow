import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/index.js";
import { createContext } from "./context.js";
import { ensureStorageBuckets } from "./lib/storage.js";

async function startServer() {
  // 1. Garante que as pastas de fotos existam no Supabase
  try {
    await ensureStorageBuckets();
    console.log("✅ Buckets de fotos verificados/criados.");
  } catch (err) {
    console.warn("⚠️ Aviso no Storage:", err);
  }

  const app = express();

  // 2. Configura o CORS para aceitar conexões 
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(express.json());

  // 3. Rota principal do tRPC
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Rota simples de teste
  app.get("/", (req, res) => res.send("BarberFlow API Online! 💈"));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();