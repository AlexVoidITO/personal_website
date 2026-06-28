import { Controller, All, Res, Req, HttpStatus } from '@nestjs/common';
import type { Response, Request } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @All('*')
  handleAll(@Req() req: Request, @Res() res: Response) {

    if (req.path.startsWith('/api')) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'API endpoint not found' });
    }

    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }
}