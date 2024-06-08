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
import { AppGateway } from './app.gateway';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
  
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
})
@Injectable()
  export class GameClientService implements OnModuleInit, OnModuleDestroy, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private wsClient: WebSocket;
    private id: number;
  

    @WebSocketServer() io: Server;

    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
      this.id = Number.MAX_SAFE_INTEGER;
    }
    handleDisconnect(client: any) {
      // throw new Error('Method not implemented.');
    }
    handleConnection(client: any, ...args: any[]) {
      const { sockets } = this.io.sockets;
      // throw new Error('Method not implemented.');
    }
    afterInit(server: any) {
      // throw new Error('Method not implemented.');

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
      const message: TxBody = {
        tx_hash: `0x${this.id.toString()}`,
        code_hash: `0xduangua`,
        objs: [
          "0x1000001",
          "0x1000002"
        ],
        args: [
          {"U24": userAddress === '0x1000001' ? 1 : 2}, // 0 la a, 1 la b
          {"U24": 6}
        ]

      }
      const tx: SubmitTx = {
        SubmitTx: {
          tx_body: message
        }
      }
        this.sendMessage(JSON.stringify(tx));
        const proof = await this.cacheManager.get<any[]>(`0xduangua-${userAddress === '0x1000001' ? 1 : 2}}`)
        console.log('proof: ', proof)
        if (!proof) {
          await this.cacheManager.set(`0xduangua-${userAddress === '0x1000001' ? 1 : 2}`, [new Date().getTime()])
        } else {
          const tempt = proof.push(new Date().getTime())
          await this.cacheManager.set(`0xduangua-${userAddress === '0x1000001' ? 1 : 2}`, proof)
        }
    }
  
    sendToAll(message: any) {
      console.log(JSON.stringify(message));
      this.io.emit('message', message);
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
  
          const a = await this.parseConfirmedTransaction(data)
          this.sendToAll({
            code_hash: 'explorer',
            data: a
          })
          // const blablabla = await LumosService.readOnChainMessage('0x7ec173c71b90ea15aabf1fe9725e0566b69f91aa74385a802481d1ac192d43af');
          // console.log('blablabla: ', blablabla)
          if (a.ret_value[2]['U24'] == 1) {
            const stepProof = await this.cacheManager.get('0xduangua-1')
            console.log(stepProof)
            const txHash = await LumosService.buildMessageTx(`racer-1:${JSON.stringify(stepProof)}`)
            await this.sendMessage(txHash)
            await this.cacheManager.set(txHash, 0, Number.MAX_SAFE_INTEGER)
            await this.sendToAll({
              code_hash: '0xduangua',
              win: 'racer1',
              txHash,
            })
            await this.sendMessage(JSON.stringify({
              ReallocateMemory: {}
            }))
          } else if(a.ret_value[2]['U24'] == 2) {
            const stepProof = await this.cacheManager.get('0xduangua-2')
            const txHash = await LumosService.buildMessageTx(`racer-2:${JSON.stringify(stepProof)}`)
            await this.sendMessage(txHash)
            await this.cacheManager.set(txHash, 0, Number.MAX_SAFE_INTEGER)
            await this.sendToAll({
              code_hash: '0xduangua',
              win: 'racer2',
              txHash,
            })
            await this.sendMessage(JSON.stringify({
              ReallocateMemory: {}
            }))
          }

          await this.cacheManager.del('0xduangua-1')
          await this.cacheManager.del('0xduangua-2')
  
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
            ret_value: retVal['Tup'],
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
  
