import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Tambahkan error handler pada pool untuk mencegah aplikasi crash saat koneksi DB terputus secara tiba-tiba
pool.on("error", (err) => {
  console.error("Kesalahan pada PostgreSQL Pool (Koneksi Terputus):", err);
  // Di lingkungan Replit/Serverless, koneksi bisa terputus oleh administrator/timeout.
  // Driver 'pg' akan mencoba menyambung kembali saat ada query baru masuk.
});

export const db = drizzle(pool, { schema });
