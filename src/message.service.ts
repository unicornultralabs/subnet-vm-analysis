// src/websocket-client.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import * as WebSocket from 'ws';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { AppGateway } from './app.gateway';

@Injectable()
export class WebSocketClientService implements OnModuleInit, OnModuleDestroy {
  private wsClient: WebSocket;
  private id: number;

  private messageTimes: number[] = [];

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly appGateway: AppGateway,
  ) {
    this.id = 0;
  }

  onModuleInit() {
    console.log('initializing...');
    this.connectToServer();
  }

  onModuleDestroy() {
    this.wsClient.close();
    this.cacheManager.reset();
  }

  private async startMessageSequence() {
    let from = 500;
    let to = from - 1;

    const balances = {};
    for (let i = from; i >= 1; i--) {
      balances[`0x${i.toString()}`] = i; // Example initialization rule
    }
    while (from >= 1) {
      while (to >= 1) {
        const message = JSON.stringify([
          {
            hash: `0x${this.id}`,
            from: `0x${from.toString()}`,
            to: `0x${to.toString()}`,
            amount: 1,
          },
        ]);
        console.log(message);
        this.sendMessage(message);
        await this.cacheManager.set(
          `pre-${this.id.toString()}`,
          JSON.parse(message),
          Number.MAX_SAFE_INTEGER,
        );
        // Update balances
        if (balances[`0x${from.toString()}`] !== undefined) {
          balances[`0x${from.toString()}`] -= 1; // Deduct amount from sender
        }
        if (balances[`0x${to.toString()}`] !== undefined) {
          balances[`0x${to.toString()}`] += 1; // Add amount to receiver
        }

        console.log(`Transaction 0x${this.id}: ${from} sends 1 to ${to}`);
        console.log(`Balance of 0x${from}: ${balances[`0x${from}`]}`);
        console.log(`Balance of 0x${to}: ${balances[`0x${to}`]}`);
        // await new Promise((resolve) => setTimeout(resolve, 1000)); // delay to prevent spam
        this.id++;
        to--;
      }
      from--;
      to = from - 1;
    }
  }

  private recordMessageTime() {
    const now = Date.now();
    this.messageTimes.push(now);

    // Remove timestamps older than 1 second from now
    while (this.messageTimes.length > 0 && this.messageTimes[0] < now - 1000) {
      this.messageTimes.shift();
    }

    const tps = this.messageTimes.length; // Number of messages in the last second
    console.log(`Current TPS: ${tps}`);
  }

  private connectToServer() {
    const serverUrl = 'ws://127.0.0.1:9001';
    this.wsClient = new WebSocket(serverUrl);

    this.wsClient.on('open', async () => {
      console.log('WebSocket connected');
      this.startMessageSequence();
    });

    this.wsClient.on('message', async (data) => {
      console.log('Received message:', data.toString());
      this.appGateway.sendToAll(data.toString());
      await this.cacheManager.set(
        `message_from_server`,
        data,
        Number.MAX_SAFE_INTEGER,
      );
      this.recordMessageTime(); // Call to update timestamps and log TPS
    });

    this.wsClient.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.wsClient.on('close', () => {
      console.log('WebSocket closed');
      // Implement reconnection logic as needed
    });
  }

  sendMessage(message: any) {
    if (this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(message);
    } else {
      console.log('WebSocket is not open. Message not sent.');
    }
  }
}
