import { Controller, Get, Param, Query, BadRequestException, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { OtelLoggerService } from './otel-logger.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly otelLogger: OtelLoggerService,
  ) {
    this.logger.log('AppController initialized');
    this.otelLogger.info('AppController initialized', AppController.name);
  }

  @Get()
  getHello(): string {
    this.logger.log('GET / called');
    this.otelLogger.info('GET / called - returning hello message', 'AppController');
    return this.appService.getHello();
  }

  @Get('data')
  getData() {
    this.logger.log('GET /data called');
    this.otelLogger.info('GET /data called', 'AppController');
    return this.appService.getBasicData();
  }

  @Get('user/:userId')
  getUser(@Param('userId') userId: string) {
    this.logger.log(`GET /user/:${userId} called`);
    this.otelLogger.info(`GET /user/:${userId} called`, 'AppController', { userId });
    try {
      return this.appService.getUserData(userId);
    } catch (error) {
      this.logger.error(`Error fetching user ${userId}: ${error.message}`);
      this.otelLogger.error(
        `Error fetching user ${userId}`,
        error,
        'AppController',
      );
      throw new BadRequestException(`Failed to fetch user: ${error.message}`);
    }
  }

  @Get('metrics')
  getMetrics(@Query('value') value?: string) {
    const numValue = value ? parseInt(value, 10) : 42;
    this.logger.log(`GET /metrics?value=${numValue} called`);
    this.otelLogger.info(
      `GET /metrics?value=${numValue} called`,
      'AppController',
      { value: numValue },
    );
    try {
      return this.appService.calculateMetrics(numValue);
    } catch (error) {
      this.logger.error(`Metrics calculation error: ${error.message}`);
      this.otelLogger.error(
        `Metrics calculation error`,
        error,
        'AppController',
      );
      throw new BadRequestException(`Metrics error: ${error.message}`);
    }
  }

  @Get('error')
  triggerError() {
    this.logger.warn('GET /error called - triggering intentional error');
    this.otelLogger.warn(
      'GET /error called - triggering intentional error',
      'AppController',
    );
    try {
      this.appService.simulateError();
    } catch (error) {
      this.logger.error(`Triggered error endpoint: ${error.message}`);
      this.otelLogger.error(
        'Triggered error endpoint',
        error,
        'AppController',
      );
      throw new BadRequestException('Intentional error triggered for testing');
    }
  }

  @Get('async/:delay')
  async asyncOperation(@Param('delay') delay?: string) {
    const ms = delay ? parseInt(delay, 10) : 1000;
    this.logger.log(`GET /async/:${ms} called`);
    this.otelLogger.info(
      `GET /async/:${ms} called`,
      'AppController',
      { delayMs: ms },
    );
    try {
      return await this.appService.processAsyncOperation(ms);
    } catch (error) {
      this.logger.error(`Async operation failed: ${error.message}`);
      this.otelLogger.error(
        'Async operation failed',
        error,
        'AppController',
      );
      throw new BadRequestException(`Async failed: ${error.message}`);
    }
  }

  @Get('health/live')
  healthLive() {
    this.logger.debug('GET /health/live called');
    this.otelLogger.debug(
      'GET /health/live called',
      'AppController',
    );
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  async healthReady() {
    this.logger.debug('GET /health/ready called');
    this.otelLogger.debug(
      'GET /health/ready called',
      'AppController',
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('system-info')
  getSystemInfo() {
    this.logger.log('GET /system-info called');
    this.otelLogger.info('GET /system-info called', 'AppController');
    return this.appService.getSystemInfo();
  }

  @Get('test-logs')
  async testLogs() {
    console.log('\n>>> GET /test-logs - Generating all log levels\n');
    
    this.logger.log('[TEST] This is an INFO log');
    this.otelLogger.info('[TEST] INFO level log via OTEL', 'AppController');
    
    this.logger.debug('[TEST] This is a DEBUG log');
    this.otelLogger.debug('[TEST] DEBUG level log via OTEL', 'AppController');
    
    this.logger.warn('[TEST] This is a WARN log');
    this.otelLogger.warn('[TEST] WARN level log via OTEL', 'AppController');
    
    this.logger.error('[TEST] This is an ERROR log');
    this.otelLogger.error('[TEST] ERROR level log via OTEL', new Error('Test error'), 'AppController');
    
    // Flush logs to ensure they're exported before response
    await this.otelLogger.flush(1000);
    
    console.log('<<< Test logs emitted and flushed, exported to SigNoz\n');
    
    return {
      message: 'Test logs sent and exported - check SigNoz logs',
      logs: ['INFO', 'DEBUG', 'WARN', 'ERROR'],
      timestamp: new Date().toISOString(),
    };
  }

  @Get('batch-operations')
  batchOperations() {
    this.logger.log('GET /batch-operations called');
    this.otelLogger.info('GET /batch-operations called', 'AppController');
    const results: any[] = [];

    for (let i = 0; i < 5; i++) {
      this.logger.log(`Processing batch item ${i + 1}/5`);
      this.otelLogger.info(
        `Processing batch item ${i + 1}/5`,
        'AppController',
        { batchItem: i + 1, batchTotal: 5 },
      );
      try {
        const result = this.appService.calculateMetrics(i * 10);
        results.push({ item: i + 1, success: true, data: result });
        this.logger.debug(`Batch item ${i + 1} completed successfully`);
        this.otelLogger.debug(
          `Batch item ${i + 1} completed successfully`,
          'AppController',
          { batchItem: i + 1 },
        );
      } catch (error) {
        this.logger.warn(`Batch item ${i + 1} failed: ${error.message}`);
        this.otelLogger.warn(
          `Batch item ${i + 1} failed`,
          'AppController',
          { batchItem: i + 1, error: error.message },
        );
        results.push({ item: i + 1, success: false, error: error.message });
      }
    }

    this.logger.log(`Batch operations completed: ${results.length} items processed`);
    this.otelLogger.info(
      `Batch operations completed: ${results.length} items processed`,
      'AppController',
      { itemsProcessed: results.length },
    );
    return { batchSize: 5, results };
  }

  @Get('simulate-load')
  simulateLoad(@Query('requests') requests?: string) {
    const count = requests ? parseInt(requests, 10) : 10;
    this.logger.log(`GET /simulate-load?requests=${count} called - generating ${count} requests`);
    this.otelLogger.info(
      `GET /simulate-load?requests=${count} called - generating ${count} requests`,
      'AppController',
      { requestCount: count },
    );

    const timestamps: any[] = [];
    for (let i = 0; i < count; i++) {
      this.logger.debug(`[LOAD] Simulated request ${i + 1}/${count}`);
      this.otelLogger.debug(
        `[LOAD] Simulated request ${i + 1}/${count}`,
        'AppController',
        { requestNumber: i + 1, totalRequests: count },
      );
      timestamps.push({
        request: i + 1,
        timestamp: new Date().toISOString(),
        value: Math.random() * 100,
      });
    }

    this.logger.log(`Load simulation completed: ${count} requests processed`);
    this.otelLogger.info(
      `Load simulation completed: ${count} requests processed`,
      'AppController',
      { totalRequests: count },
    );
    return { simulatedRequests: count, timestamps };
  }

  @Get('exception/:type')
  throwException(@Param('type') type: string) {
    this.logger.warn(`GET /exception/:${type} called - throwing ${type} exception`);
    this.otelLogger.warn(
      `GET /exception/:${type} called - throwing ${type} exception`,
      'AppController',
      { exceptionType: type },
    );

    switch (type) {
      case 'validation':
        this.logger.error('Validation exception triggered');
        this.otelLogger.error(
          'Validation exception triggered',
          new Error('Validation failed'),
          'AppController',
        );
        throw new BadRequestException('Validation failed');

      case 'not-found':
        this.logger.error('Resource not found exception triggered');
        this.otelLogger.error(
          'Resource not found exception triggered',
          new Error('Resource not found'),
          'AppController',
        );
        throw new BadRequestException('Resource not found');

      case 'server':
        this.logger.error('Server error exception triggered');
        this.otelLogger.error(
          'Server error exception triggered',
          new Error('Internal server error'),
          'AppController',
        );
        throw new Error('Internal server error');

      case 'timeout':
        this.logger.error('Timeout exception triggered');
        this.otelLogger.error(
          'Timeout exception triggered',
          new Error('Operation timed out'),
          'AppController',
        );
        throw new Error('Operation timed out');

      default:
        this.logger.error(`Unknown exception type: ${type}`);
        this.otelLogger.error(
          `Unknown exception type: ${type}`,
          new Error(`Unknown exception type: ${type}`),
          'AppController',
        );
        throw new BadRequestException(`Unknown exception type: ${type}`);
    }
  }

  @Get('generate-logs/:count')
  async generateMassLogs(@Param('count') count?: string) {
    const numLogs = count ? parseInt(count, 10) : 100;
    console.log(`\n>>> Generating ${numLogs} logs rapidly...\n`);

    for (let i = 1; i <= numLogs; i++) {
      const logLevel = i % 4;
      const message = `[BULK-LOG ${i}/${numLogs}] Generated log message`;

      switch (logLevel) {
        case 0:
          this.otelLogger.info(message, 'AppController', {
            logNumber: i,
            bulkSize: numLogs,
          });
          break;
        case 1:
          this.otelLogger.debug(message, 'AppController', {
            logNumber: i,
            bulkSize: numLogs,
          });
          break;
        case 2:
          this.otelLogger.warn(message, 'AppController', {
            logNumber: i,
            bulkSize: numLogs,
          });
          break;
        case 3:
          this.otelLogger.error(
            message,
            new Error(`Error ${i}`),
            'AppController',
          );
          break;
      }
    }

    // Flush logs to ensure they're exported before response
    await this.otelLogger.flush(2000);

    console.log(
      `<<< ${numLogs} logs generated, emitted, and flushed to SigNoz\n`,
    );

    return {
      message: `Generated and exported ${numLogs} logs`,
      levels: ['INFO', 'DEBUG', 'WARN', 'ERROR'],
      timestamp: new Date().toISOString(),
      note: 'Logs exported - check SigNoz Logs tab',
    };
  }
}
