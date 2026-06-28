import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';
import { HttpStatus, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Логирование запросов
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.log(`${req.method} ${req.url}`);
    next();
  });

  // Проверка SERVICE_MODE (ДО статики)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    const serviceMode = process.env.SERVICE_MODE?.trim().toLowerCase();
    const maintenance =
      serviceMode === 'true' ||
      serviceMode === '1' ||
      serviceMode === 'on' ||
      serviceMode === 'yes';

    if (maintenance) {
      logger.warn(`SERVICE_MODE active – returning 503 for ${req.url}`);
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).sendFile(
        join(process.cwd(), 'public', 'service.html'),
      );
    }
    next();
  });

  app.useStaticAssets(join(process.cwd(), 'public'), {
    setHeaders: (res, path) => {
      if (path.match(/\.(gif|png|jpg|jpeg|webp|svg|ico)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  });

  // SPA-обработчик: для всех запросов, кроме /api
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  });

  app.setGlobalPrefix('api');

  const server = await app.listen(3000);
  const externalPort = parseInt(process.env.APP_PORT || '8080', 10);

  logger.log(` Server is running on: http://localhost:${externalPort}`);
  logger.log(` API LastFm endpoint: http://localhost:${externalPort}/api/lastfm`);
  logger.log(` API Weather endpoint: http://localhost:${externalPort}/api/weather`);
  logger.log(` SERVICE_MODE = ${process.env.SERVICE_MODE || 'false'}`);
}
bootstrap();