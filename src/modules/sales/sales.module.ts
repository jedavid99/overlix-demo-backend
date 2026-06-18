import { Module } from '@nestjs/common';
import { SalesService } from './services/sales.service';
import { SalesController } from './controllers/sales.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
