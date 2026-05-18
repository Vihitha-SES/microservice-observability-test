import { Injectable } from '@nestjs/common';
import { logs } from '@opentelemetry/api-logs';

export enum LogLevel {
  TRACE = 1,
  DEBUG = 5,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  FATAL = 50,
}

@Injectable()
export class OtelLoggerService {
  private logger = logs.getLogger('app');

  private getLogLevelNumber(level: LogLevel): number {
    return level;
  }

  private getLogLevelText(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE:
        return 'TRACE';
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.ERROR:
        return 'ERROR';
      case LogLevel.FATAL:
        return 'FATAL';
      default:
        return 'UNKNOWN';
    }
  }

  private emit(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ) {
    const attributes: Record<string, any> = {
      'log.level': this.getLogLevelText(level),
    };

    if (context) {
      attributes['logger.name'] = context;
      attributes['context'] = context;
    }

    if (metadata) {
      Object.assign(attributes, metadata);
    }

    try {
      const logRecord = {
        severityNumber: this.getLogLevelNumber(level),
        severityText: this.getLogLevelText(level),
        body: message,
        attributes,
        timestamp: Date.now() * 1_000_000, // nanoseconds
      };
      
      this.logger.emit(logRecord);
      
      // Debug output to verify emission
      console.log(
        `[OTEL-LOG-EMITTED] ${this.getLogLevelText(level)} | ${message}`,
      );
    } catch (error) {
      console.error('[OTEL Logger] Emit failed:', error);
    }
  }

  trace(message: string, context?: string, metadata?: Record<string, any>) {
    this.emit(LogLevel.TRACE, message, context, metadata);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.emit(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.emit(LogLevel.INFO, message, context, metadata);
  }

  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.emit(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.emit(LogLevel.WARN, message, context, metadata);
  }

  error(message: string, error?: any, context?: string) {
    const metadata: Record<string, any> = {};
    if (error) {
      if (error instanceof Error) {
        metadata['error.type'] = error.name;
        metadata['error.message'] = error.message;
        metadata['error.stack'] = error.stack;
      } else {
        metadata['error'] = JSON.stringify(error);
      }
    }
    this.emit(LogLevel.ERROR, message, context, metadata);
  }

  fatal(message: string, error?: any, context?: string) {
    const metadata: Record<string, any> = {};
    if (error) {
      if (error instanceof Error) {
        metadata['error.type'] = error.name;
        metadata['error.message'] = error.message;
        metadata['error.stack'] = error.stack;
      } else {
        metadata['error'] = JSON.stringify(error);
      }
    }
    this.emit(LogLevel.FATAL, message, context, metadata);
  }
}
