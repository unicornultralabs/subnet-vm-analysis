import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { RedisClientOptions } from 'redis';
import { redisStore } from 'cache-manager-redis-store';
import { WebSocketClientService } from './message.service';
import { AppGateway } from './app.gateway';

@Module({
  imports: [
    CacheModule.registerAsync<RedisClientOptions>({
      useFactory: async () => {
        return {
          store: redisStore as unknown as CacheStore,
          ttl: Number.MAX_SAFE_INTEGER,
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, WebSocketClientService, AppGateway],
})
export class AppModule {}
