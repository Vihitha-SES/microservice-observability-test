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

// gRPC exporters expect a host:port address (no http/https scheme) — default port 4317
const DEFAULT_OTLP_ENDPOINT = 'localhost:4317';

const serviceName = process.env.OTEL_SERVICE_NAME || process.env.APP_NAME || 'microservice-test';
// Normalize OTLP endpoint: remove http(s) scheme and any /v1/* suffix so gRPC exporters receive host:port
function normalizeGrpcEndpoint(raw?: string) {
  if (!raw || raw.length === 0) return DEFAULT_OTLP_ENDPOINT;
  const noProto = raw.replace(/^https?:\/\//, '');
  return noProto.replace(/\/v1\/(traces|metrics|logs)\/?$/, '').replace(/\/$/, '');
}

const otlpBase = normalizeGrpcEndpoint(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP || DEFAULT_OTLP_ENDPOINT);

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

console.log('[OTEL] using collector endpoint (gRPC host:port):', otlpBase);

// Emit a one-off test metric to validate metrics export path
try {
  const diagMeter = metrics.getMeter('otel-diagnostics');
  const startupCounter = diagMeter.createCounter('signoz_startup_metric', { description: 'Startup test metric to validate OTLP export' });
  startupCounter.add(1, { service: serviceName });
  console.log('[OTEL] emitted startup test metric');
} catch (e) {
  console.warn('[OTEL] failed to emit startup test metric', e);
}

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
