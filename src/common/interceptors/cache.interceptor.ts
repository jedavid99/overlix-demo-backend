import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private redis: Redis | null = null;
  private static errorLogged = false;

  constructor() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        if (!CacheInterceptor.errorLogged) {
          console.error('Redis connection error, cache disabled:', err.message);
          CacheInterceptor.errorLogged = true;
        }
        this.redis = null;
      });
    } catch (error) {
      if (!CacheInterceptor.errorLogged) {
        console.error('Redis not available, cache disabled');
        CacheInterceptor.errorLogged = true;
      }
      this.redis = null;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const cacheKey = `cache:${method}:${url}`;

    if (method === 'GET' && this.redis) {
      return new Observable((observer) => {
        this.redis!.get(cacheKey).then((cached) => {
          if (cached) {
            observer.next(JSON.parse(cached));
            observer.complete();
          } else {
            next.handle().subscribe({
              next: (data) => {
                this.redis!.setex(cacheKey, 60, JSON.stringify(data));
                observer.next(data);
                observer.complete();
              },
              error: (err) => observer.error(err),
            });
          }
        }).catch(() => {
          // Redis error, proceed without cache
          next.handle().subscribe({
            next: (data) => {
              observer.next(data);
              observer.complete();
            },
            error: (err) => observer.error(err),
          });
        });
      });
    }

    return next.handle();
  }
}
