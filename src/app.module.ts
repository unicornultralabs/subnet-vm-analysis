import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { RedisClientOptions } from 'redis';
import { redisStore } from 'cache-manager-redis-store';
import { WebSocketClientService } from './message.service';
import { AppGateway } from './app.gateway';
import { ConfigModule } from '@nestjs/config';
import { GameService } from './game.service';

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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, WebSocketClientService, AppGateway, GameService],
})
export class AppModule {}
