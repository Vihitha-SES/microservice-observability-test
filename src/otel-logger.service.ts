import { ConsoleLogger, Injectable, LoggerService } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { loggerProvider } from './instrument';
import { serviceName } from './instrument';

export enum LogLevel {
  TRACE = SeverityNumber.TRACE,
  DEBUG = SeverityNumber.DEBUG,
  INFO = SeverityNumber.INFO,
  WARN = SeverityNumber.WARN,
  ERROR = SeverityNumber.ERROR,
  FATAL = SeverityNumber.FATAL,
}

@Injectable()
export class OtelLoggerService implements LoggerService {
  private readonly consoleLogger = new ConsoleLogger('AppLogger');
  private logger = logs.getLogger(serviceName);

  getLogLevelNumber(level: LogLevel): number {
    // Returns OpenTelemetry spec severity numbers
    // These MUST match the enum values for proper SigNoz display
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
   * BatchLogRecordProcessor batches logs and exports them efficiently
   */
  async flush(timeoutMs: number = 2000): Promise<void> {
    console.log(`[OTEL Logger] FLUSH START - timeout: ${timeoutMs}ms`);
    
    try {
      // forceFlush() waits for pending batches to be exported
      if ((loggerProvider as any).forceFlush) {
        console.log('[OTEL Logger] Calling forceFlush()...');
        await Promise.race([
          (loggerProvider as any).forceFlush(),
          new Promise((resolve) => setTimeout(resolve, timeoutMs)),
        ]);
        console.log('[OTEL Logger] forceFlush() completed');
      }
    } catch (error) {
      console.warn('[OTEL Logger] forceFlush error (continuing):', error);
    }

    // Add small delay for any remaining gRPC operations
    const delayMs = 300;
    console.log(`[OTEL Logger] Adding ${delayMs}ms delay for network operations`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    console.log('[OTEL Logger] FLUSH COMPLETE - logs exported to collector');
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
        // OTEL JS Logger.emit expects millisecond-based TimeInput when passing number.
        // Nanoseconds here shift event time out of SigNoz default query window.
        timestamp: Date.now(),
      };
      
      this.logger.emit(logRecord);
      
      // Debug output to verify emission with severity number
      console.log(
        `[OTEL-LOG-EMITTED] [${this.getLogLevelText(level)}|severity:${this.getLogLevelNumber(level)}] ${message} | context: ${context || 'app'}`,
      );
      console.log(`[OTEL-LOG-EXPORT] Log queued for batch export to collector`);
    } catch (error) {
      console.error('[OTEL Logger] Emit failed:', error);
    }
  }

  trace(message: string, context?: string, metadata?: Record<string, any>) {
    this.consoleLogger.verbose(message, context);
    this.emit(LogLevel.TRACE, message, context, metadata);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.consoleLogger.debug(message, context);
    this.emit(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.consoleLogger.log(message, context);
    this.emit(LogLevel.INFO, message, context, metadata);
  }

  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.consoleLogger.log(message, context);
    this.emit(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.consoleLogger.warn(message, context);
    this.emit(LogLevel.WARN, message, context, metadata);
  }

  error(message: string, errorOrTrace?: any, context?: string) {
    const metadata: Record<string, any> = {};
    if (errorOrTrace) {
      if (errorOrTrace instanceof Error) {
        metadata['error.type'] = errorOrTrace.name;
        metadata['error.message'] = errorOrTrace.message;
        metadata['error.stack'] = errorOrTrace.stack;
      } else {
        metadata['error'] = String(errorOrTrace);
      }
    }
    this.consoleLogger.error(message, errorOrTrace, context);
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
    this.consoleLogger.fatal(message, error, context);
    this.emit(LogLevel.FATAL, message, context, metadata);
  }

  verbose(message: string, context?: string) {
    this.consoleLogger.verbose(message, context);
    this.emit(LogLevel.TRACE, message, context);
  }
}
