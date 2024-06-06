import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';
import { GameClientService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
})
@Injectable()
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AppGateway.name);

  constructor(
    private readonly gameService: GameClientService,
  ) {
  }
  
  @WebSocketServer() io: Server;

  afterInit() {
    this.logger.log('Initialized');
  }

  handleConnection(client: any) {
    const { sockets } = this.io.sockets;

    this.logger.log(`Client id: ${client.id} connected`);
    this.logger.debug(`Number of connected clients: ${sockets.size}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Cliend id:${client.id} disconnected`);
  }

  @SubscribeMessage('message')
  handleMessage(client: any, data: any) {
    this.logger.log(`Message received from client id: ${client.id}`);
    this.logger.debug(`Payload: ${data}`);

    this.gameService.racing(data.userAddress)
    
    return {
      event: 'pong',
      data: 'Wrong data that will make the test fail',
    };
  }
  sendToAll(message: any) {
    this.io.emit('message', message);
  }
}
