import { Module } from '@nestjs/common';
import { BusinessInfoService } from './business-info.service';
import { BusinessInfoController } from './business-info.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessInfoController],
  providers: [BusinessInfoService],
  exports: [BusinessInfoService],
})
export class BusinessInfoModule {}
