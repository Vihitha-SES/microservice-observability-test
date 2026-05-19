import './instrument';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { OtelLoggerService } from './otel-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const appLogger = app.get(OtelLoggerService);

  // Route Nest framework logs through OTEL-enabled logger.
  app.useLogger(appLogger);

  // Runtime self-test through custom logger path (not console.log).
  appLogger.info('Startup self-test INFO log', 'Bootstrap');
  appLogger.warn('Startup self-test WARN log', 'Bootstrap');
  appLogger.error('Startup self-test ERROR log', new Error('Startup self-test error'), 'Bootstrap');
  appLogger.flush(1500).catch(() => undefined);
  
  const port = process.env.PORT || 3000;
  
  logger.log(`Starting application on port ${port}`);
  logger.log('OpenTelemetry enabled - tracing, metrics, and logs active');
  
  await app.listen(port);
  
  logger.log(`✓ Application is running on: http://localhost:${port}`);
  logger.log('Available endpoints:');
  logger.log('  GET /                    - Basic endpoint');
  logger.log('  GET /data                - Get basic data');
  logger.log('  GET /user/:userId        - Get user data');
  logger.log('  GET /metrics?value=X     - Calculate metrics');
  logger.log('  GET /error               - Trigger error');
  logger.log('  GET /async/:delay        - Async operation');
  logger.log('  GET /health/live         - Liveness probe');
  logger.log('  GET /health/ready        - Readiness probe');
  logger.log('  GET /system-info         - System information');
  logger.log('  GET /test-logs           - Test all log levels');
  logger.log('  GET /batch-operations    - Batch processing');
  logger.log('  GET /simulate-load       - Load simulation');
  logger.log('  GET /exception/:type     - Throw exceptions');
  logger.log('  GET /metrics             - Prometheus metrics');
}

bootstrap();



