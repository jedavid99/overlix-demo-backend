import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DATABASE_POOL',
      useFactory: async (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');

        console.log('🔌 Conectando a Supabase PostgreSQL...');
        console.log(`   Connection String: ${connectionString ? '✓ Configurada' : '✗ No configurada'}`);

        const pool = new Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: configService.get<number>('DB_POOL_MAX') || 20,
          idleTimeoutMillis: configService.get<number>('DB_IDLE_TIMEOUT') || 30000,
          connectionTimeoutMillis: configService.get<number>('DB_CONNECTION_TIMEOUT') || 2000,
        });

        // Event listeners para monitoreo de conexión
        pool.on('connect', () => {
          console.log('✅ Conexión establecida con Supabase PostgreSQL');
        });

        pool.on('error', (err) => {
          console.error('❌ Error inesperado en el pool de conexiones:', err);
        });

        // Probar conexión
        try {
          const client = await pool.connect();
          const result = await client.query('SELECT version()');
          console.log('📊 Versión de PostgreSQL:', result.rows[0].version.split(',')[0]);
          client.release();
          console.log('✅ Conexión a Supabase verificada exitosamente');
        } catch (error) {
          console.error('❌ Error al conectar a Supabase:', error.message);
          throw error;
        }

        return pool;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['DATABASE_POOL'],
})
export class DatabaseModule {}
