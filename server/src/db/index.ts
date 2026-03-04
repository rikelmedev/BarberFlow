import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não configurada no ficheiro .env");
}

// Configuração específica para o Supabase (Transaction Mode porta 6543)
const client = postgres(process.env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });

console.log("✅ Conexão com o banco de dados inicializada.");