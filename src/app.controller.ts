import { Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { WebSocketClientService } from './message.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    readonly wsService: WebSocketClientService,
  ) {}

  @Post('reinit')
  getHello(): void {
    this.wsService.reInit();
  }
}
