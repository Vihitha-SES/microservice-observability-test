import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// gRPC exporters use the base endpoint only (port 4317), no /v1/* path needed
const base = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317')
  .replace(/\/v1\/(traces|metrics|logs)\/?$/, '').replace(/\/$/, '');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'nest-microservice-test',
  }),
  traceExporter: new OTLPTraceExporter({
    url: base,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: base,
    }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: base,
    }),
  ),
  instrumentations: [getNodeAutoInstrumentations()],
});

export default sdk;
