import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Microservice collecting traces, logs, and metrics';
  }

  @Get('data')
  getData() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/live')
  healthLive() {
    return { status: 'alive' };
  }

  @Get('health/ready')
  async healthReady() {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { status: 'ready' };
  }
}
