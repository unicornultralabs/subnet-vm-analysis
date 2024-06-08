/* eslint-disable prettier/prettier */
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
import { GameClientService } from './game.service';

@Injectable()
export class WebSocketClientService implements OnModuleInit, OnModuleDestroy {
  private wsClient: WebSocket;
  private id: number;

  private messageTimes: number[] = [];

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly appGateway: AppGateway,
    private readonly gameService: GameClientService,
  ) {
    this.id = 0;
  }

  async onModuleInit() {
    console.log('initializing... wait 10 secs');
    await new Promise((resolve) => setTimeout(resolve, 1000)); // delay to prevent spam
    // this.connectToServer();
  }

  async reInit() {
    this.connectToServer();
  }

  onModuleDestroy() {
    this.wsClient.close();
    this.cacheManager.reset();
  }

  private async startMessageSequence() {
    let from = 100;
    let to = from - 1;

    const balances = {};
    for (let i = from; i >= 1; i--) {
      balances[`0x${i.toString()}`] = i; // Example initialization rule
    }
    while (from >= 1) {
      while (to >= 1) {
        const txBody: TxBody =
        {
          tx_hash: `0x${this.id}`,
          code_hash: '0xtransfer',
          objs: [
            `0x${from.toString()}`,
            `0x${to.toString()}`,
          ],
          args: [{ "U24": 1 }],
        }

        const submitTx: SubmitTx = {
          SubmitTx: {
            tx_body: txBody
          },
        }
        this.sendMessage(JSON.stringify(submitTx));
        await this.cacheManager.set(
          `0x${this.id}`,
          {
            from: `0x${from.toString()}`,
            to: `0x${to.toString()}`,
          }
        )
        await this.cacheManager.set(
          `pre-${this.id.toString()}`,
          txBody,
          Number.MAX_SAFE_INTEGER,
        );
        // Update balances
        if (balances[`0x${from.toString()}`] !== undefined) {
          balances[`0x${from.toString()}`] -= 1; // Deduct amount from sender
        }
        if (balances[`0x${to.toString()}`] !== undefined) {
          balances[`0x${to.toString()}`] += 1; // Add amount to receiver
        }

        // console.log(`Transaction 0x${this.id}: ${from} sends 1 to ${to}`);
        // console.log(`Balance of 0x${from}: ${balances[`0x${from}`]}`);
        // console.log(`Balance of 0x${to}: ${balances[`0x${to}`]}`);
        // await new Promise((resolve) => setTimeout(resolve, 500)); // delay to prevent spam
        this.id++;
        to--;
      }
      from--;
      to = from - 1;
    }
    this.sendMessage(JSON.stringify({
      ReallocateMemory: {}
    }))
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
    return tps;
  }

  private connectToServer() {
    const serverUrl = process.env.WEBSOCKET;
    this.wsClient = new WebSocket(serverUrl);

    this.wsClient.on('open', async () => {
      console.log('WebSocket connected');
      this.startMessageSequence();
    });

    this.wsClient.on('race', (data: { userAddress: string }) => {
      console.log(data.userAddress)
      this.gameService.racing(data.userAddress)
    });

    this.wsClient.on('message', async (data) => {
      const parsedValue = await this.parseConfirmedTransaction(data);
      await this.appGateway.sendToAll({
        code_hash: 'explorer',
        data: parsedValue,
      })
      const tx = await this.cacheManager.get<{ from: string, to: string }>(`${parsedValue.hash}`)
      const tps = this.recordMessageTime(); // Call to update timestamps and log TPS
      await this.appGateway.sendToAll({
        code_hash: '0xtransfer',
        from_value: parsedValue.from_value,
        to_value: parsedValue.to_value,
        from_address: tx.from,
        to_address: tx.to,
        tps
      })
      // console.log(parsedValue)
      // await this.cacheManager.set(
      //   `message_from_server`,
      //   data,
      //   Number.MAX_SAFE_INTEGER,
      // );
    });

    this.wsClient.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.wsClient.on('close', () => {
      console.log('WebSocket closed');
      // Implement reconnection logic as needed
    });
  }

  sendMessage(message: string) {
    if (this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(message);
    } else {
      console.log('WebSocket is not open. Message not sent.');
    }
  }

  private async parseConfirmedTransaction(data: any): Promise<ConfirmTx> {
    // console.log('Received message:', data.toString());
    // TODO(rameight): parse msg from ConfirmTransaction
    const svmConfirmedTransaction: SVMConfirmedTransaction = JSON.parse(data.toString());
    if (!svmConfirmedTransaction.status) {
      throw new Error("tx execution failed");
    }

    switch (svmConfirmedTransaction.code_hash) {
      case "0xtransfer":
        const retVal = svmConfirmedTransaction.ret_value!;
        const parsedRetVal = this.parseTransferRetVal(retVal);
        // const tx = await this.cacheManager.get(`${svmConfirmedTransaction.tx_hash}`)
        // console.log(tx, parsedRetVal);
        return {
          hash: svmConfirmedTransaction.tx_hash,
          status: svmConfirmedTransaction.status,
          from_value: parsedRetVal.fromVal,
          to_value: parsedRetVal.toVal,
        }
      default:
        throw new Error("unknown code hash for parsing confirmed transaction");
    }
  }

  private parseTransferRetVal(retVal: SVMPrimitives) {
    console.log('ret val: ,', retVal['Tup'][0])
    if (retVal['Tup']) {
      return {
        fromVal: retVal['Tup'][0].U24 as number,
        toVal: retVal['Tup'][1].U24 as number
      }
    }
    // switch (retVal.type) {
    //   case "Tup":
    //     const tup = retVal.value;
    //     return {
    //       fromVal: tup[0].value as number,
    //       toVal: tup[1].value as number
    //     }
    //   default:
    //     throw new Error("unexpected return value of transfer");
    // }
  }
}
