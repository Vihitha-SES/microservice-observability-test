import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { OtelLoggerService } from './otel-logger.service';
import { ServiceMetricsService } from './service-metrics.service';

@Injectable()
export class OtelExceptionInterceptor implements NestInterceptor {
  constructor(
    private readonly otelLogger: OtelLoggerService,
    private readonly serviceMetrics: ServiceMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();

    return next.handle().pipe(
      catchError((exception) => {
        const activeSpan = trace.getActiveSpan();
        const status = exception?.status ?? exception?.statusCode ?? 500;
        const message = exception?.message ?? 'Unhandled exception';

        if (activeSpan) {
          activeSpan.recordException(exception);
          activeSpan.setAttributes({
            'http.method': request.method,
            'http.target': request.url,
            'http.status_code': status,
            'exception.type': exception?.name || 'Error',
            'exception.message': message,
            'exception.stacktrace': exception?.stack,
          });
          activeSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message,
          });
        }

        this.serviceMetrics.recordException({
          exceptionType: exception?.name || 'Error',
          httpMethod: request.method,
          httpRoute: request.route?.path ?? request.url,
          httpStatusCode: status,
        });

        this.otelLogger.error(
          `[${request.method}] ${request.url} | Status: ${status} | Message: ${message}`,
          exception,
          'OtelExceptionInterceptor',
        );

        return throwError(() => exception);
      }),
    );
  }
}