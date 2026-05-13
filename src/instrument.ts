import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { metrics } from '@opentelemetry/api';
import { HostMetrics } from '@opentelemetry/host-metrics';
import * as dotenv from 'dotenv';

dotenv.config();

// gRPC exporters use the base endpoint only (no /v1/* path) — port 4317
const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4317';

const serviceName = process.env.OTEL_SERVICE_NAME || process.env.APP_NAME || 'microservice-test';
// Strip any /v1/* path suffix that might be leftover from HTTP-style env vars
const otlpBase = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || DEFAULT_OTLP_ENDPOINT)
  .replace(/\/v1\/(traces|metrics|logs)\/?$/, '').replace(/\/$/, '');

// 1. Initialize OpenTelemetry SDK (vendor-neutral OTLP/HTTP exporters)
export const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({ url: otlpBase }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: otlpBase }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: otlpBase }),
  ),
  instrumentations: [
    getNodeAutoInstrumentations(),
    new PinoInstrumentation({
      logHook: (span, record) => {
        try {
          record['trace_id'] = span.spanContext().traceId;
          record['span_id'] = span.spanContext().spanId;
        } catch {
          // noop if span is not available
        }
      },
    }),
  ],
});

// Start the OTEL SDK
otelSDK.start();

// 1.5 Start host metrics collection
const hostMetrics = new HostMetrics({
  meterProvider: metrics.getMeterProvider(),
  name: `${serviceName}-host-metrics`,
});
hostMetrics.start();

// 2. Graceful Shutdown (Critical for Railway restarts)
const shutdown = () => {
  otelSDK.shutdown()
    .then(() => console.log('[OTEL] SDK shut down successfully'))
    .catch((error) => console.log('[OTEL] Error shutting down SDK', error))
    .finally(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
