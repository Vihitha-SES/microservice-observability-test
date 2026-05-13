import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import * as dotenv from 'dotenv';

dotenv.config();

// Normalize OTLP endpoint: remove http/https and trailing slashes for gRPC
function normalizeGrpcEndpoint(raw?: string) {
  if (!raw) return 'localhost:4317';
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const otlpEndpoint = normalizeGrpcEndpoint(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost:4317'
);
const serviceName = process.env.OTEL_SERVICE_NAME || 'microservice-test';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
  }),
  traceExporter: new OTLPTraceExporter({ url: otlpEndpoint }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: otlpEndpoint }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: otlpEndpoint }),
  ),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log(`[OpenTelemetry] Started. Exporting to ${otlpEndpoint}. Service: ${serviceName}`);

const shutdown = () => {
  sdk.shutdown()
    .then(() => console.log('[OpenTelemetry] Shutdown successful'))
    .catch((e) => console.log('[OpenTelemetry] Shutdown error', e))
    .finally(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
