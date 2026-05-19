import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './http-exception.filter';
import { OtelExceptionInterceptor } from './otel-exception.interceptor';
import { OtelLoggerService } from './otel-logger.service';
import { ServiceMetricsService } from './service-metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OtelLoggerService,
    ServiceMetricsService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OtelExceptionInterceptor,
    },
  ],
})
export class AppModule {}
