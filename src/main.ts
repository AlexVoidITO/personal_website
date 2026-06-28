import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';
import { HttpStatus, Logger } from '@nestjs/common';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const fileCache = new Map<string, { data: Buffer; contentType: string }>();

async function warmupCache() {
  const publicDir = join(process.cwd(), 'public');
  if (!existsSync(publicDir)) {
    console.warn('public directory not found, skipping cache warmup');
    return;
  }

  const mimeTypes: Record<string, string> = {
    '.gif': 'image/gif',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.html': 'text/html',
    '.txt': 'text/plain',
  };

  try {
    const files = await readdir(publicDir, { withFileTypes: true, recursive: true });
    let count = 0;
    for (const file of files) {
      if (file.isFile()) {
        const filePath = join(file.parentPath || publicDir, file.name);
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const contentType = mimeTypes[`.${ext}`] || 'application/octet-stream';
        try {
          const data = await readFile(filePath);
          if (contentType.startsWith('image/') || contentType.startsWith('text/')) {
            let relativePath = filePath.replace(publicDir, '').replace(/\\/g, '/');
            if (!relativePath.startsWith('/')) {
              relativePath = '/' + relativePath;
            }
            fileCache.set(relativePath, { data, contentType });
            count++;
          }
        } catch {
        }
      }
    }
    console.log(` Cache warmed up: ${count} files loaded into memory`);
    const keys = Array.from(fileCache.keys()).slice(0, 10);
    console.log(` Sample cached paths:`, keys);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(' Failed to warm up cache:', errorMessage);
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Логирование запросов
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.log(`${req.method} ${req.url}`);
    next();
  });

  // SERVICE_MODE
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

  // Middleware для отдачи из кеша (с логированием)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path === '/' || req.path === '/index.html') {
      return next();
    }

    const cached = fileCache.get(req.path);
    if (cached) {
      logger.log(` Cache hit: ${req.path} (${cached.contentType})`);
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Content-Length', cached.data.length);
      res.write(cached.data);
      res.end();
      return;
    } else {
      logger.log(` Cache miss: ${req.path}`);
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

  // SPA
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  });

  app.setGlobalPrefix('api');

  warmupCache();

  const server = await app.listen(3000);
  const externalPort = parseInt(process.env.APP_PORT || '8080', 10);

  logger.log(` Server is running on: http://localhost:${externalPort}`);
  logger.log(` API LastFm endpoint: http://localhost:${externalPort}/api/lastfm`);
  logger.log(` API Weather endpoint: http://localhost:${externalPort}/api/weather`);
  logger.log(`🔧 SERVICE_MODE = ${process.env.SERVICE_MODE || 'false'}`);
}
bootstrap();