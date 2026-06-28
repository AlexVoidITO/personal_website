import { Module } from '@nestjs/common';
import { LastfmService } from './lastfm.service';
import { LastfmController } from './lastfm.controller';

@Module({
  providers: [LastfmService],
  controllers: [LastfmController],
  exports: [LastfmService],
})
export class LastfmModule {}