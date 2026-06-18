import { Module } from '@nestjs/common';
import { SocialMediaService } from './social-media.service';
import { SocialMediaController } from './social-media.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialMediaController],
  providers: [SocialMediaService],
  exports: [SocialMediaService],
})
export class SocialMediaModule {}
