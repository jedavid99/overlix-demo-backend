import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SalesModule } from './modules/sales/sales.module';
import { RepairsModule } from './modules/repairs/repairs.module';
import { ProductsModule } from './modules/products/products.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { RolesModule } from './modules/roles/roles.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { SocialMediaModule } from './modules/social-media/social-media.module';
import { BusinessHoursModule } from './modules/business-hours/business-hours.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthController } from './common/controllers/health.controller';
import { DatabaseModule } from './database/database.module';
import { SupabaseClientMiddleware } from './common/middlewares/supabase-client.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return [
          {
            name: 'short',
            ttl: config.get<number>('THROTTLE_TTL') || 60000,
            limit: config.get<number>('THROTTLE_LIMIT') || 100,
          },
          {
            name: 'long',
            ttl: 3600000, // 1 hora
            limit: 1000, // 1000 peticiones por hora
          },
          {
            name: 'auth',
            ttl: 300000, // 5 minutos
            limit: 5, // 5 intentos de login por 5 minutos
          },
        ];
      },
    }),
    DatabaseModule,
    AuthModule,
    ClientsModule,
    SalesModule,
    RepairsModule,
    ProductsModule,
    ExpensesModule,
    AppointmentsModule,
    RolesModule,
    BusinessInfoModule,
    ShipmentsModule,
    SocialMediaModule,
    BusinessHoursModule,
    AuditLogModule,
  ],
  controllers: [HealthController],
  providers: [SupabaseClientMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SupabaseClientMiddleware).forRoutes('*');
  }
}
