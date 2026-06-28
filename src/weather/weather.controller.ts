import { Controller, Get, Logger } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  private readonly logger = new Logger(WeatherController.name);

  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getWeather() {
    this.logger.log('GET /api/weather – запрос получен');
    return this.weatherService.getWeather();
  }
}