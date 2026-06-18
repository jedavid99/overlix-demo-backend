import { Module } from '@nestjs/common';
import { BusinessHoursService } from './business-hours.service';
import { BusinessHoursController } from './business-hours.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessHoursController],
  providers: [BusinessHoursService],
  exports: [BusinessHoursService],
})
export class BusinessHoursModule {}
