import { Module } from '@nestjs/common';
import { ClientsService } from './services/clients.service';
import { ClientsController } from './controllers/clients.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
