import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace, metrics, diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import * as dotenv from 'dotenv';

dotenv.config();

// Enable OTEL diagnostics to console for error visibility
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Normalize OTLP endpoint: ensure http scheme for gRPC
function normalizeGrpcEndpoint(raw?: string) {
  if (!raw) return 'http://localhost:4317';
  let endpoint = raw.replace(/\/$/, ''); // Remove trailing slash
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = 'http://' + endpoint; // Add http:// if missing
  }
  return endpoint;
}

const otlpEndpoint = normalizeGrpcEndpoint(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'
);
const serviceName = process.env.OTEL_SERVICE_NAME || 'microservice-test';

console.log(`[OTEL] Initializing with endpoint: ${otlpEndpoint}, service: ${serviceName}`);

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
  }),
  traceExporter: new OTLPTraceExporter({ url: otlpEndpoint }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: otlpEndpoint }),
    }),
  ],
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({ url: otlpEndpoint }),
    ),
  ],
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log(`[OTEL] SDK started successfully`);

// Emit startup telemetry to ensure data reaches collector
try {
  // 1. Test trace
  const tracer = trace.getTracer('startup');
  const span = tracer.startSpan('service.startup');
  span.addEvent('OpenTelemetry service started');
  span.end();
  console.log(`[OTEL] Emitted startup trace`);

  // 2. Test metric
  const meter = metrics.getMeter('startup');
  const counter = meter.createCounter('service.startup.total');
  counter.add(1, { service: serviceName });
  console.log(`[OTEL] Emitted startup metric`);
} catch (e) {
  console.log(`[OTEL] Error emitting startup telemetry:`, e);
}

const shutdown = () => {
  sdk.shutdown()
    .then(() => console.log('[OTEL] Shutdown successful'))
    .catch((e) => console.log('[OTEL] Shutdown error', e))
    .finally(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
