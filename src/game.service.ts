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
  import LumosService from './ckb-lib.service'
  
  @Injectable()
  export class GameClientService implements OnModuleInit, OnModuleDestroy {
    private wsClient: WebSocket;
    private id: number;
  
    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
        console.log("Hello racer", addr);
        this.connectToServer(addr)
    }
  
    private async startMessageSequence(userAddress: string) {
      console.log(userAddress)
        this.sendMessage(JSON.stringify({
            "code_hash": '0xduangua',
            "address": userAddress,
            "step": 1,
        }));
    }
  
  
    connectToServer(userAddress: string) {
      const serverUrl = process.env.WEBSOCKET;
      this.wsClient = new WebSocket(serverUrl);
  
      this.wsClient.on('open', async () => {
        console.log('WebSocket connected');
        this.startMessageSequence(userAddress);
      });

      this.wsClient.on('message', async (data) => {
        // TODO: win thì gọi ckb để submit
        console.log('received: ', data)
        try {
          // Convert buffer to string
          const message = data.toString();
  
          // Parse the string to JSON
          const jsonData = JSON.parse(message);
  
          console.log('Received:', jsonData);
          const a = await this.parseConfirmedTransaction(data)
          console.log('aaa: ', a.ret_value)
          if (a.ret_value == 1) {
            const txHash = await LumosService.buildMessageTx('b won')
            const result = await LumosService.readOnChainMessage('0xeaedefc431ad97c66234fd0a82b2f675c2e64b89e4d851f4cd798677c37b6aab');
            await this.sendMessage(txHash)
            await this.cacheManager.set(txHash, 0, Number.MAX_SAFE_INTEGER)
            console.log('result: ', result)
          } else {
            const txHash = await LumosService.buildMessageTx('a won')
            const result = await LumosService.readOnChainMessage('0xeaedefc431ad97c66234fd0a82b2f675c2e64b89e4d851f4cd798677c37b6aab');
            await this.cacheManager.set(txHash, 0, Number.MAX_SAFE_INTEGER)
            await this.sendMessage(txHash)
            console.log('result: ', result)
          }
  
          // TODO: Call ckb to submit if needed
      } catch (error) {
          console.error('Failed to parse message:', error);
      }
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
  
    private async parseConfirmedTransaction(data: any): Promise<DuanguaTx> {
      // console.log('Received message:', data.toString());
      // TODO(rameight): parse msg from ConfirmTransaction
      const svmConfirmedTransaction: SVMConfirmedTransaction = JSON.parse(data);
      if (!svmConfirmedTransaction.status) {
        throw new Error("tx execution failed");
      }
  
      switch (svmConfirmedTransaction.code_hash) {
        case "0xduangua":
          const retVal = svmConfirmedTransaction.ret_value!;
          // const parsedRetVal = this.parseTransferRetVal(retVal);
          // const tx = await this.cacheManager.get(`${svmConfirmedTransaction.tx_hash}`)
          // console.log(tx, parsedRetVal);
          return {
            hash: svmConfirmedTransaction.tx_hash,
            status: svmConfirmedTransaction.status,
            ret_value: retVal['U24'],
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
  
