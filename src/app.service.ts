import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache ) {}
  getHello(): string {
    return 'Hello World!';
  }
}
