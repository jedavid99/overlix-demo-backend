import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      supabase: SupabaseClient | null;
    }
  }
}

@Injectable()
export class SupabaseClientMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SupabaseClientMiddleware.name);
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.logger.warn('SUPABASE_URL or SUPABASE_ANON_KEY not configured');
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.supabase = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      req.supabase = supabase;
      next();
    } catch (error) {
      this.logger.error('Error creating Supabase client:', error);
      req.supabase = null;
      next();
    }
  }
}
