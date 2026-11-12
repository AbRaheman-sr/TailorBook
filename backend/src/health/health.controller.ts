import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  api: 'online';
  database: {
    status: 'connected' | 'disconnected' | 'unconfigured';
    message: string;
    latencyMs?: number;
  };
  environment: string;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthCheckResponse> {
    const dbHealth = await this.databaseService.checkHealth();
    const env = this.configService.get<string>('NODE_ENV', 'development');

    return {
      status: dbHealth.status === 'connected' ? 'ok' : 'degraded',
      api: 'online',
      database: dbHealth,
      environment: env,
      timestamp: new Date().toISOString(),
    };
  }
}

