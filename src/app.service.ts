import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor() {
    this.logger.log('AppService initialized');
  }

  getHello(): string {
    this.logger.log('getHello() called');
    return 'Hello World!';
  }

  getBasicData() {
    this.logger.log('Processing basic data request');
    const data = {
      message: 'Basic data endpoint',
      timestamp: new Date().toISOString(),
      random: Math.random(),
    };
    this.logger.debug(`Returning data: ${JSON.stringify(data)}`);
    return data;
  }

  getUserData(userId: string) {
    this.logger.log(`Fetching user data for userId: ${userId}`);
    if (!userId || userId === '0') {
      const error = 'Invalid user ID provided';
      this.logger.warn(`User data fetch failed: ${error}`);
      throw new Error(error);
    }
    const userData = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      created: new Date().toISOString(),
    };
    this.logger.log(`Successfully fetched user ${userId}`);
    return userData;
  }

  calculateMetrics(value: number) {
    this.logger.log(`Calculating metrics for value: ${value}`);
    if (value < 0) {
      this.logger.error(`Invalid metric value: ${value}`);
      throw new Error('Metric value cannot be negative');
    }
    const result = {
      input: value,
      squared: value * value,
      squared_root: Math.sqrt(value),
      percentage: (value / 100) * 100,
    };
    this.logger.debug(`Metrics calculated: ${JSON.stringify(result)}`);
    return result;
  }

  simulateError() {
    this.logger.warn('Simulating application error');
    throw new Error('Intentional error for logging test');
  }

  async processAsyncOperation(delay: number) {
    this.logger.log(`Starting async operation with ${delay}ms delay`);
    try {
      await new Promise((resolve) => {
        setTimeout(() => {
          this.logger.log(`Async operation completed after ${delay}ms`);
          resolve(null);
        }, delay);
      });
      return { status: 'completed', delay };
    } catch (error) {
      this.logger.error(`Async operation failed: ${error}`);
      throw error;
    }
  }

  getSystemInfo() {
    this.logger.log('Fetching system info');
    const info = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    };
    this.logger.debug(`System info: ${JSON.stringify(info)}`);
    return info;
  }
}
