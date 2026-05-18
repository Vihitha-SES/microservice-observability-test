import { Injectable, Logger } from '@nestjs/common';
import { OtelLoggerService } from './otel-logger.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly otelLogger: OtelLoggerService) {
    this.logger.log('AppService initialized');
    this.otelLogger.info('AppService initialized', AppService.name);
  }

  getHello(): string {
    this.logger.log('getHello() called');
    this.otelLogger.info('getHello() called', AppService.name);
    return 'Hello World!';
  }

  getBasicData() {
    this.logger.log('Processing basic data request');
    this.otelLogger.info('Processing basic data request', AppService.name);
    const data = {
      message: 'Basic data endpoint',
      timestamp: new Date().toISOString(),
      random: Math.random(),
    };
    this.logger.debug(`Returning data: ${JSON.stringify(data)}`);
    this.otelLogger.debug(
      `Returning data with random value: ${data.random}`,
      AppService.name,
      { random: data.random },
    );
    return data;
  }

  getUserData(userId: string) {
    this.logger.log(`Fetching user data for userId: ${userId}`);
    this.otelLogger.info(
      `Fetching user data for userId: ${userId}`,
      AppService.name,
      { userId },
    );
    if (!userId || userId === '0') {
      const error = 'Invalid user ID provided';
      this.logger.warn(`User data fetch failed: ${error}`);
      this.otelLogger.warn(
        `User data fetch failed: ${error}`,
        AppService.name,
        { userId },
      );
      throw new Error(error);
    }
    const userData = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      created: new Date().toISOString(),
    };
    this.logger.log(`Successfully fetched user ${userId}`);
    this.otelLogger.info(
      `Successfully fetched user ${userId}`,
      AppService.name,
      { userId },
    );
    return userData;
  }

  calculateMetrics(value: number) {
    this.logger.log(`Calculating metrics for value: ${value}`);
    this.otelLogger.info(
      `Calculating metrics for value: ${value}`,
      AppService.name,
      { value },
    );
    if (value < 0) {
      this.logger.error(`Invalid metric value: ${value}`);
      this.otelLogger.error(
        `Invalid metric value: ${value}`,
        new Error('Metric value cannot be negative'),
        AppService.name,
      );
      throw new Error('Metric value cannot be negative');
    }
    const result = {
      input: value,
      squared: value * value,
      squared_root: Math.sqrt(value),
      percentage: (value / 100) * 100,
    };
    this.logger.debug(`Metrics calculated: ${JSON.stringify(result)}`);
    this.otelLogger.debug(
      `Metrics calculated successfully`,
      AppService.name,
      { input: value, squared: result.squared },
    );
    return result;
  }

  simulateError() {
    this.logger.warn('Simulating application error');
    this.otelLogger.warn('Simulating application error', AppService.name);
    throw new Error('Intentional error for logging test');
  }

  async processAsyncOperation(delay: number) {
    this.logger.log(`Starting async operation with ${delay}ms delay`);
    this.otelLogger.info(
      `Starting async operation with ${delay}ms delay`,
      AppService.name,
      { delayMs: delay },
    );
    try {
      await new Promise((resolve) => {
        setTimeout(() => {
          this.logger.log(`Async operation completed after ${delay}ms`);
          this.otelLogger.info(
            `Async operation completed after ${delay}ms`,
            AppService.name,
            { delayMs: delay },
          );
          resolve(null);
        }, delay);
      });
      return { status: 'completed', delay };
    } catch (error) {
      this.logger.error(`Async operation failed: ${error}`);
      this.otelLogger.error(
        'Async operation failed',
        error,
        AppService.name,
      );
      throw error;
    }
  }

  getSystemInfo() {
    this.logger.log('Fetching system info');
    this.otelLogger.info('Fetching system info', AppService.name);
    const info = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    };
    this.logger.debug(`System info: ${JSON.stringify(info)}`);
    this.otelLogger.debug(
      `System info retrieved`,
      AppService.name,
      {
        uptime: info.uptime,
        heapUsed: info.memory.heapUsed,
      },
    );
    return info;
  }
}
