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
  
  @Injectable()
  export class GameClientService implements OnModuleInit, OnModuleDestroy {
    private wsClient: WebSocket;
    private id: number;
  
    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
      private readonly appGateway: AppGateway,
    ) {
      this.id = 1;
    }
  
    async onModuleInit() {
      console.log('initializing... wait 10 secs');
    //   await new Promise((resolve) => setTimeout(resolve, 1000)); // delay to prevent spam
    //   this.connectToServer();
    }
  
    onModuleDestroy() {
      this.wsClient.close();
      this.cacheManager.reset();
    }

    async racing(addr: string) {
        console.log("Hello racer");
        this.connectToServer(addr)
    }
  
    private async startMessageSequence(userAddress: string) {
        this.sendMessage({
            code_hash: 'take_next_step',
            "address": `0x${userAddress}`,
        });
    }
  
  
    connectToServer(userAddress: string) {
      const serverUrl = process.env.WEBSOCKET;
      this.wsClient = new WebSocket(serverUrl);
  
      this.wsClient.on('open', async () => {
        console.log('WebSocket connected');
        this.startMessageSequence(userAddress);
      });
  
      this.wsClient.on('message1', async (data) => {
        // TODO: win thì gọi ckb để submit
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
  
    private async parseConfirmedTransaction(data: any): Promise<ConfirmTx> {
      // console.log('Received message:', data.toString());
      // TODO(rameight): parse msg from ConfirmTransaction
      const svmConfirmedTransaction: SVMConfirmedTransaction = JSON.parse(data);
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
  
