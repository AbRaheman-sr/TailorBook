import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import path from 'path';
import pg, { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

const { Pool } = pg;

export type DatabaseHealthStatus = 'connected' | 'disconnected' | 'unconfigured';

export interface DatabaseHealthResult {
  status: DatabaseHealthStatus;
  message: string;
  latencyMs?: number;
}

@Injectable()
export class DatabaseService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(DatabaseService.name);
  private pool: pg.Pool | null = null;
  private isConfigured = false;
  private placeholderDetected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const rawUrl = this.configService.get<string>('DATABASE_URL');

    if (!rawUrl || rawUrl.trim() === '') {
      this.logger.warn(
        'DATABASE_URL is not set. Database operations will be unavailable.',
      );
      this.isConfigured = false;
      return;
    }

    if (rawUrl.includes('[YOUR-PASSWORD]')) {
      this.logger.warn(
        'DATABASE_URL contains placeholder [YOUR-PASSWORD]. Pending actual database password in .env.',
      );
      this.isConfigured = false;
      this.placeholderDetected = true;
      return;
    }

    try {
      const parsed = new URL(rawUrl);
      const safeHost = `${parsed.protocol}//${parsed.username}@${parsed.hostname}:${parsed.port}${parsed.pathname}`;
      this.logger.log(`Initializing PostgreSQL connection pool to: ${safeHost}`);

      this.pool = new Pool({
        connectionString: rawUrl,
        ssl: {
          rejectUnauthorized: false,
        },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10,
      });

      this.pool.on('error', (err: Error) => {
        this.logger.error(`Unexpected database pool error: ${err.message}`);
      });

      this.isConfigured = true;

      // Automatically run pending migrations on startup
      await this.runPendingMigrations();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to initialize database pool: ${errorMsg}`);
      this.isConfigured = false;
    }
  }

  async runPendingMigrations(): Promise<void> {
    if (!this.pool || !this.isConfigured) return;

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();

      // Ensure migrations tracker table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      // Locate migrations directory
      const candidatePaths = [
        path.resolve(process.cwd(), 'database', 'migrations'),
        path.resolve(process.cwd(), 'backend', 'database', 'migrations'),
      ];

      let migrationsDir = '';
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          migrationsDir = p;
          break;
        }
      }

      if (!migrationsDir) {
        this.logger.warn('Migrations directory not found, skipping migration check.');
        return;
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const checkRes = await client.query(
          'SELECT version FROM schema_migrations WHERE version = $1',
          [file]
        );

        if (checkRes.rowCount === 0) {
          this.logger.log(`Applying migration: ${file}...`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query(
              'INSERT INTO schema_migrations (version) VALUES ($1)',
              [file]
            );
            await client.query('COMMIT');
            this.logger.log(`Migration ${file} applied successfully.`);
          } catch (mErr: any) {
            await client.query('ROLLBACK');
            this.logger.error(`Migration ${file} failed: ${mErr.message}`);
            break;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not run migrations: ${err.message}`);
    } finally {
      if (client) client.release();
    }
  }

  async query<R extends QueryResultRow = any>(
    queryText: string,
    values?: any[],
  ): Promise<QueryResult<R>> {
    if (!this.pool || !this.isConfigured) {
      throw new Error(
        'Database connection pool is not configured or password is missing.',
      );
    }
    return this.pool.query<R>(queryText, values);
  }

  async checkHealth(): Promise<DatabaseHealthResult> {
    if (this.placeholderDetected) {
      return {
        status: 'unconfigured',
        message:
          'Database password is pending configuration. Replace [YOUR-PASSWORD] in backend/.env with your actual Supabase password.',
      };
    }

    if (!this.isConfigured || !this.pool) {
      return {
        status: 'unconfigured',
        message: 'DATABASE_URL is not configured in environment variables.',
      };
    }

    const start = Date.now();
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1 AS health');
      const latencyMs = Date.now() - start;
      return {
        status: 'connected',
        message: 'PostgreSQL connection active and healthy.',
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Database health check failed: ${errorMsg}`);

      if (
        errorMsg.includes('ENOTFOUND') ||
        errorMsg.includes('EHOSTUNREACH') ||
        errorMsg.includes('ETIMEDOUT')
      ) {
        return {
          status: 'disconnected',
          message:
            'Network unreachable: direct Supabase connection requires IPv6. If IPv6 is not available on your network, use the Supabase Session Pooler connection string.',
          latencyMs,
        };
      }

      return {
        status: 'disconnected',
        message: `Database connection error: ${errorMsg}`,
        latencyMs,
      };
    } finally {
      if (client) {
        try {
          client.release();
        } catch {
          // ignore
        }
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.closePool();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.closePool();
  }

  private async closePool(): Promise<void> {
    if (this.pool) {
      this.logger.log('Closing PostgreSQL connection pool gracefully...');
      try {
        await this.pool.end();
        this.logger.log('PostgreSQL connection pool closed.');
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error closing connection pool: ${errorMsg}`);
      } finally {
        this.pool = null;
      }
    }
  }
}
