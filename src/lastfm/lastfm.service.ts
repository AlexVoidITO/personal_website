import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LastfmService {
  private readonly logger = new Logger(LastfmService.name);
  private cache: { track: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30000; // 30 секунд

  constructor(private configService: ConfigService) {}

  async getNowPlaying() {
    const apiKey = this.configService.get('LASTFM_API_KEY');
    const user = this.configService.get('LASTFM_USER');

    this.logger.log(`API Key present: ${!!apiKey}, User: ${user || 'не указан'}`);

    if (!apiKey || !user) {
      this.logger.warn('Last.fm API key or user not configured');
      return { error: 'Last.fm API key or user not configured' };
    }

    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      this.logger.log('Значение вернулось из кеша');
      return this.cache.track;
    }

    try {
      const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${apiKey}&format=json&limit=1`;
      this.logger.log(`Запрос к Last.fm: ${url}`);
      const response = await axios.get(url);
      this.logger.log('Ответ от Last.fm получен');

      const tracks = response.data.recenttracks?.track;
      if (!tracks || tracks.length === 0) {
        this.logger.warn('Нет треков в ответе');
        return { error: 'No recent tracks found' };
      }

      const track = tracks[0];
      const isNowPlaying = track['@attr']?.nowplaying === 'true';

      const result = {
        artist: track.artist?.['#text'] || 'Unknown',
        name: track.name || 'Unknown',
        album: track.album?.['#text'] || '',
        image: track.image?.[3]?.['#text'] || '',
        nowPlaying: isNowPlaying,
        url: track.url || '',
      };

      this.logger.log(`Трек: ${result.artist} – ${result.name} (nowPlaying: ${isNowPlaying})`);
      this.cache = { track: result, timestamp: Date.now() };
      return result;
    } catch (error ) {
        if (error instanceof Error){
            this.logger.error(`Ошибка API от Last.fm: ${error.message}`);
            return { error: 'Failed to fetch from Last.fm' };
        }

    }
  }
}