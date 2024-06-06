import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";


@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {

    
    onModuleDestroy() {

    }
    
    async onModuleInit() {
        console.log('initializing game service');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // delay to prevent spam
    }

    async racing() {
        console.log("Hello racer");
    }

}