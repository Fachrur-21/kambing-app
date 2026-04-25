import mysql from 'mysql2/promise'

function buildConfigFromEnv() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL)

    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kambing_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
}

const globalForDb = globalThis

const db = globalForDb.__mysqlPool || mysql.createPool(buildConfigFromEnv())

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__mysqlPool = db
}

export async function query(sql, params = []) {
  const [rows] = await db.execute(sql, params)
  return rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

export default db