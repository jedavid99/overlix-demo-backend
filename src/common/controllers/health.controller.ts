import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { Pool } from 'pg';

@Controller('health')
export class HealthController {
  constructor(@Inject('DATABASE_POOL') private pool: Pool) {}

  @Get()
  @Public()
  async check() {
    const startTime = Date.now();
    let databaseStatus = 'disconnected';
    let databaseLatency = null;

    try {
      const result = await this.pool.query('SELECT 1 as test');
      if (result.rows.length > 0) {
        databaseStatus = 'connected';
        databaseLatency = Date.now() - startTime;
      }
    } catch (error) {
      databaseStatus = 'disconnected';
      console.error('Database health check failed:', error);
    }

    const uptime = process.uptime();
    const status = databaseStatus === 'connected' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      service: 'TechRepair Pro Backend',
      version: '1.0.0',
      database: databaseStatus,
      databaseLatency,
      uptime: Math.floor(uptime),
      uptimeFormatted: this.formatUptime(uptime),
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
