import { Pool } from "pg";
import { env } from "../config/env";

/**
 * Pool de conexiones a PostgreSQL, compartido por toda la aplicación.
 * Usar un pool (en vez de una sola conexión) permite atender varias
 * solicitudes al mismo tiempo sin abrir una conexión nueva cada vez.
 */
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
});

pool.on("error", (err) => {
  // Error en una conexión inactiva del pool (por ejemplo, la base de datose cayó). Se registra para diagnóstico; no se debe tumbar el servidor.
  console.error("Error inesperado en el pool de PostgreSQL:", err.message);
});

/**
 * Verifica que la base de datos responda. Se usa al iniciar el servidor
 * para dar un mensaje claro si PostgreSQL no está disponible.
 */
export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS ahorro NUMERIC(12, 2) NOT NULL DEFAULT 0.00;"
    );
  } finally {
    client.release();
  }
}
