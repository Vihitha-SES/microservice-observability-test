import { Controller, Get, Param, Query, BadRequestException, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {
    this.logger.log('AppController initialized');
  }

  @Get()
  getHello(): string {
    this.logger.log('GET / called');
    return this.appService.getHello();
  }

  @Get('data')
  getData() {
    this.logger.log('GET /data called');
    return this.appService.getBasicData();
  }

  @Get('user/:userId')
  getUser(@Param('userId') userId: string) {
    this.logger.log(`GET /user/:${userId} called`);
    try {
      return this.appService.getUserData(userId);
    } catch (error) {
      this.logger.error(`Error fetching user ${userId}: ${error.message}`);
      throw new BadRequestException(`Failed to fetch user: ${error.message}`);
    }
  }

  @Get('metrics')
  getMetrics(@Query('value') value?: string) {
    const numValue = value ? parseInt(value, 10) : 42;
    this.logger.log(`GET /metrics?value=${numValue} called`);
    try {
      return this.appService.calculateMetrics(numValue);
    } catch (error) {
      this.logger.error(`Metrics calculation error: ${error.message}`);
      throw new BadRequestException(`Metrics error: ${error.message}`);
    }
  }

  @Get('error')
  triggerError() {
    this.logger.warn('GET /error called - triggering intentional error');
    try {
      this.appService.simulateError();
    } catch (error) {
      this.logger.error(`Triggered error endpoint: ${error.message}`);
      throw new BadRequestException('Intentional error triggered for testing');
    }
  }

  @Get('async/:delay')
  async asyncOperation(@Param('delay') delay?: string) {
    const ms = delay ? parseInt(delay, 10) : 1000;
    this.logger.log(`GET /async/:${ms} called`);
    try {
      return await this.appService.processAsyncOperation(ms);
    } catch (error) {
      this.logger.error(`Async operation failed: ${error.message}`);
      throw new BadRequestException(`Async failed: ${error.message}`);
    }
  }

  @Get('health/live')
  healthLive() {
    this.logger.debug('GET /health/live called');
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  async healthReady() {
    this.logger.debug('GET /health/ready called');
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('system-info')
  getSystemInfo() {
    this.logger.log('GET /system-info called');
    return this.appService.getSystemInfo();
  }

  @Get('test-logs')
  testLogs() {
    this.logger.log('[TEST] This is an INFO log');
    this.logger.debug('[TEST] This is a DEBUG log');
    this.logger.warn('[TEST] This is a WARN log');
    this.logger.error('[TEST] This is an ERROR log');
    return {
      message: 'Test logs sent - check SigNoz logs',
      logs: ['INFO', 'DEBUG', 'WARN', 'ERROR'],
    };
  }

  @Get('batch-operations')
  batchOperations() {
    this.logger.log('GET /batch-operations called');
    const results: any[] = [];

    for (let i = 0; i < 5; i++) {
      this.logger.log(`Processing batch item ${i + 1}/5`);
      try {
        const result = this.appService.calculateMetrics(i * 10);
        results.push({ item: i + 1, success: true, data: result });
        this.logger.debug(`Batch item ${i + 1} completed successfully`);
      } catch (error) {
        this.logger.warn(`Batch item ${i + 1} failed: ${error.message}`);
        results.push({ item: i + 1, success: false, error: error.message });
      }
    }

    this.logger.log(`Batch operations completed: ${results.length} items processed`);
    return { batchSize: 5, results };
  }

  @Get('simulate-load')
  simulateLoad(@Query('requests') requests?: string) {
    const count = requests ? parseInt(requests, 10) : 10;
    this.logger.log(`GET /simulate-load?requests=${count} called - generating ${count} requests`);

    const timestamps: any[] = [];
    for (let i = 0; i < count; i++) {
      this.logger.debug(`[LOAD] Simulated request ${i + 1}/${count}`);
      timestamps.push({
        request: i + 1,
        timestamp: new Date().toISOString(),
        value: Math.random() * 100,
      });
    }

    this.logger.log(`Load simulation completed: ${count} requests processed`);
    return { simulatedRequests: count, timestamps };
  }

  @Get('exception/:type')
  throwException(@Param('type') type: string) {
    this.logger.warn(`GET /exception/:${type} called - throwing ${type} exception`);

    switch (type) {
      case 'validation':
        this.logger.error('Validation exception triggered');
        throw new BadRequestException('Validation failed');

      case 'not-found':
        this.logger.error('Resource not found exception triggered');
        throw new BadRequestException('Resource not found');

      case 'server':
        this.logger.error('Server error exception triggered');
        throw new Error('Internal server error');

      case 'timeout':
        this.logger.error('Timeout exception triggered');
        throw new Error('Operation timed out');

      default:
        this.logger.error(`Unknown exception type: ${type}`);
        throw new BadRequestException(`Unknown exception type: ${type}`);
    }
  }
}
