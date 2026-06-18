import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';

@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  getPoolConfig(): PoolConfig {
    return {
      host: this.configService.get<string>('DATABASE_HOST') || 'localhost',
      port: this.configService.get<number>('DATABASE_PORT') || 5432,
      database: this.configService.get<string>('DATABASE_NAME') || 'techrepair_pro',
      user: this.configService.get<string>('DATABASE_USER') || 'postgres',
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      max: this.configService.get<number>('DATABASE_POOL_MAX') || 20,
      idleTimeoutMillis: this.configService.get<number>('DATABASE_IDLE_TIMEOUT') || 30000,
      connectionTimeoutMillis: this.configService.get<number>('DATABASE_CONNECTION_TIMEOUT') || 2000,
    };
  }

  getSupabaseConfig() {
    return {
      url: this.configService.get<string>('SUPABASE_URL'),
      anonKey: this.configService.get<string>('SUPABASE_ANON_KEY'),
      serviceRoleKey: this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
    };
  }
}
