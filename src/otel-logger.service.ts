import { Injectable } from '@nestjs/common';
import { logs } from '@opentelemetry/api-logs';
import { loggerProvider } from './instrument';

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

  getLogLevelNumber(level: LogLevel): number {
    return level;
  }

  getLogLevelText(level: LogLevel): string {
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

  /**
   * Flush pending logs to ensure they're exported to SigNoz collector
   * This MUST wait for gRPC export to complete before returning
   */
  async flush(timeoutMs: number = 3000): Promise<void> {
    console.log(`[OTEL Logger] FLUSH START - timeout: ${timeoutMs}ms`);
    
    try {
      // Try calling forceFlush if available
      if ((loggerProvider as any).forceFlush) {
        console.log('[OTEL Logger] Calling forceFlush()...');
        await (loggerProvider as any).forceFlush(timeoutMs);
        console.log('[OTEL Logger] forceFlush() completed');
      } else {
        console.log('[OTEL Logger] forceFlush not available, using delay only');
      }
    } catch (error) {
      console.warn('[OTEL Logger] forceFlush error (continuing):', error);
    }

    // CRITICAL: Add delay for gRPC to complete export
    // SimpleLogRecordProcessor sends logs asynchronously over gRPC
    // We MUST wait long enough for the network call to complete
    const delayMs = Math.max(timeoutMs * 0.8, 1500); // At least 1.5 seconds
    console.log(`[OTEL Logger] Waiting ${delayMs}ms for gRPC export...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    console.log('[OTEL Logger] FLUSH COMPLETE - logs should be exported to collector');
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
        `[OTEL-LOG-EMITTED] [${this.getLogLevelText(level)}] ${message} | context: ${context || 'app'}`,
      );
      console.log(`[OTEL-LOG-EXPORT] Log queued for gRPC export to collector`);
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
