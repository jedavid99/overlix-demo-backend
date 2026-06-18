import { Module } from '@nestjs/common';
import { RepairsService } from './services/repairs.service';
import { RepairsController } from './controllers/repairs.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RepairsController],
  providers: [RepairsService],
  exports: [RepairsService],
})
export class RepairsModule {}
