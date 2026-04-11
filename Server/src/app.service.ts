import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  message: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'connecting' | 'disconnected' | 'unknown';
    readyState?: number;
  };
}

const MONGOOSE_READY_STATES: Record<
  number,
  HealthCheckResponse['database']['status']
> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnected',
};

@Injectable()
export class AppService {
  constructor(
    @Optional() @InjectConnection() private readonly connection?: Connection,
  ) {}

  getHealth(): HealthCheckResponse {
    const readyState = this.connection?.readyState;
    const databaseStatus =
      typeof readyState === 'number'
        ? (MONGOOSE_READY_STATES[readyState] ?? 'unknown')
        : 'unknown';

    return {
      status: databaseStatus === 'connected' ? 'ok' : 'degraded',
      message: 'INHALEX API running',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        status: databaseStatus,
        readyState,
      },
    };
  }
}
