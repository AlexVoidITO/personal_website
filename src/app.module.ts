import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LastfmModule } from './lastfm/lastfm.module';
import {WeatherModule} from './weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LastfmModule,
    WeatherModule,
  ],
  controllers: [], 
})
export class AppModule {}