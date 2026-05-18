import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OtelLoggerService } from './otel-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly otelLogger = new OtelLoggerService();

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';
    let errorDetails = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message || exception.message
          : exception.message;
      errorDetails = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    }

    // Log the exception with all details to both console and OTEL
    const logMessage = `[${request.method}] ${request.url} | Status: ${status} | Message: ${message}`;
    
    this.logger.error(logMessage);
    
    this.otelLogger.error(
      logMessage,
      exception,
      HttpExceptionFilter.name,
    );

    // Emit structured error log with full context
    this.otelLogger.error(
      `HTTP Exception caught`,
      exception,
      'HttpExceptionFilter',
    );

    response.status(status).json({
      statusCode: status,
      message: message,
      path: request.url,
      timestamp: new Date().toISOString(),
      error: message,
    });
  }
}
