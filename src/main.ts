import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const logger = new Logger('Bootstrap');

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Enable compression
  app.use(compression());

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global transform interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation (only in development)
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('TechRepair Pro API')
      .setDescription('API para sistema de gestión de servicio técnico')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger documentation available at /${apiPrefix}/docs`);
  }

  // Railway uses PORT environment variable automatically
  const port = configService.get<number>('PORT') || 3000;
  
  // Listen on all interfaces (required for Railway)
  await app.listen(port, '0.0.0.0');

  if (isProduction) {
    logger.log(`Application is running in production mode`);
    logger.log(`API endpoint: https://${configService.get<string>('RAILWAY_PUBLIC_DOMAIN') || 'your-domain.railway.app'}/${apiPrefix}`);
    logger.log(`Health check: https://${configService.get<string>('RAILWAY_PUBLIC_DOMAIN') || 'your-domain.railway.app'}/${apiPrefix}/health`);
  } else {
    logger.log(`Application is running in development mode`);
    logger.log(`API endpoint: http://localhost:${port}/${apiPrefix}`);
    logger.log(`Health check: http://localhost:${port}/${apiPrefix}/health`);
  }

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    
    // Close database connection
    try {
      const databaseModule = app.get('DATABASE_POOL');
      if (databaseModule) {
        await databaseModule.end();
        console.log('Database connection closed');
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
    }

    // Close Redis connection (optional - may not be available)
    try {
      if ((app as any)._graph) {
        const redisModule = (app as any)._graph._providers.find((p: any) => p.token === 'REDIS_CLIENT');
        if (redisModule && redisModule.instance) {
          await redisModule.instance.quit();
          console.log('Redis connection closed');
        }
      }
    } catch (error) {
      // Redis may not be configured or available, ignore error silently
    }

    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
}

bootstrap();
