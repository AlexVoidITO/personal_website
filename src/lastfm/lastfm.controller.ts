import { Controller, Get, Logger } from '@nestjs/common';
import { LastfmService } from './lastfm.service';

@Controller('lastfm')
export class LastfmController {
  private readonly logger = new Logger(LastfmController.name);

  constructor(private readonly lastfmService: LastfmService) {}

  @Get()
  async getNowPlaying() {
    this.logger.log('GET /api/lastfm – запрос получен');
    return this.lastfmService.getNowPlaying();
  }
}