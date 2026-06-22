import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImapService } from './imap.service';
import {Get} from '@nestjs/common';

@Controller('admin/imap')
@UseGuards(JwtAuthGuard)
export class ImapController {
  constructor(private imapService: ImapService) {}

  /** POST /admin/imap/poll-now — fuerza una ronda de polling inmediata */
  @Post('poll-now')
  async pollNow() {
    const result = await this.imapService.pollInbox();
    return {
      success: true,
      mensaje: 'Polling ejecutado',
      ...result,
    };
  }

  @Get('debug-inbox')
  async debugInbox() {
    return this.imapService.debugInbox();
  }
}
