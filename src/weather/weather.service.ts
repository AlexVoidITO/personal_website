import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

export interface MeteoData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_weather_units: {
    time: string;
    interval: string;
    temperature: string;
    windspeed: string;
    winddirection: string;
    is_day: string;
    weathercode: string;
  };
  current_weather: {
    time: string;
    interval: number;
    temperature: number;
    windspeed: number;
    winddirection: number;
    is_day: 0 | 1;
    weathercode: number;
  };
}

export interface WeatherResponse {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  is_day: 0 | 1;
  time: string;
  units: {
    temperature: string;
    windspeed: string;
    winddirection: string;
    weathercode: string;
  };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private cache: { data: WeatherResponse; timestamp: number } | null = null;
  private readonly CACHE_TTL = 600000; 

  constructor(private configService: ConfigService) {}

  async getWeather(): Promise<WeatherResponse | { error: string }> {
    const latitude = this.configService.get<number>('LAT');
    const longitude = this.configService.get<number>('LON');
    const timezone = this.configService.get<string>('TIMEZONE') || 'Europe/Moscow';

    this.logger.log(`latitude: ${latitude}, longitude: ${longitude}`);

    if (!latitude && !longitude){
        this.logger.warn('missing coordinates');
        return {error:'missing coordinates'};
    }
    if (!latitude || !longitude) {
      if (!latitude) {this.logger.warn('missing latitude');
        return {error:'missing latitude'};
      };
      if (!longitude) {this.logger.warn('missing longitude');
        return {error:'missing longitude'};
    }}


    if (this.cache) {
      const age = Date.now() - this.cache.timestamp;
      this.logger.log(`Кеш существует, возраст: ${age}ms (TTL: ${this.CACHE_TTL}ms)`);
      if (age < this.CACHE_TTL) {
        this.logger.log('Кеш валиден, значение из кеша');
        return this.cache.data;
      } else {
        this.logger.log('Кеш устарел, произодится новый запрос');
      }
    } else {
      this.logger.log('Отсутсвует значение кеша');
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=${timezone}`;
      this.logger.log(`Запрос к Open-Meteo: ${url}`);
      const response = await axios.get<MeteoData>(url);
      this.logger.log('Ответ от Open-Meteo получен');

      const data = response.data;

      const result: WeatherResponse = {
        temperature: data.current_weather.temperature,
        windspeed: data.current_weather.windspeed,
        winddirection: data.current_weather.winddirection,
        weathercode: data.current_weather.weathercode,
        is_day: data.current_weather.is_day,
        time: data.current_weather.time,
        units: {
          temperature: data.current_weather_units.temperature,
          windspeed: data.current_weather_units.windspeed,
          winddirection: data.current_weather_units.winddirection,
          weathercode: data.current_weather_units.weathercode,
        },
      };

      this.cache = { data: result, timestamp: Date.now() };
      this.logger.log('Данные сохранены в кеш');

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Ошибка запроса к Open-Meteo: ${error.message}`);
        return { error: 'Failed to fetch weather data' };
      }
      return { error: 'Unknown error' };
    }
  }
}