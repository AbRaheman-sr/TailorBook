import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('tailorbook.db');

  // Configure pragmas for performance and data safety
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      bill_number TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      photo_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by_device_id TEXT,
      CONSTRAINT unq_tenant_bill UNIQUE (tenant_id, bill_number)
    );

    CREATE INDEX IF NOT EXISTS idx_bills_tenant_number ON bills(tenant_id, bill_number);
    CREATE INDEX IF NOT EXISTS idx_bills_tenant_phone ON bills(tenant_id, customer_phone);
    CREATE INDEX IF NOT EXISTS idx_bills_tenant_created ON bills(tenant_id, created_at DESC);
  `);

  return dbInstance;
}

