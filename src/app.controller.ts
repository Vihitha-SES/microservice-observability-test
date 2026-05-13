import { Controller, Get } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('microservice-service-meter');
const callsCounter = meter.createCounter('signoz_calls_total', {
  description: 'Total number of incoming requests',
});
const latencyHistogram = meter.createHistogram('signoz_latency', {
  description: 'Request latency in milliseconds',
});

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    const start = Date.now();
    callsCounter.add(1, { route: '/' });
    const res = 'Hello from NestJS Railway Observability!';
    latencyHistogram.record(Date.now() - start, { route: '/' });
    return res;
  }

  @Get('data')
  getData() {
    const start = Date.now();
    callsCounter.add(1, { route: '/data' });
    const resp = {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
    latencyHistogram.record(Date.now() - start, { route: '/data' });
    return resp;
  }

  @Get('health/live')
  healthLive() {
    const start = Date.now();
    callsCounter.add(1, { route: '/health/live' });
    const resp = { status: 'alive' };
    latencyHistogram.record(Date.now() - start, { route: '/health/live' });
    return resp;
  }

  @Get('health/slow')
  async healthSlow() {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 2000));
    const resp = { status: 'slow', delay: '2s' };
    callsCounter.add(1, { route: '/health/slow' });
    latencyHistogram.record(Date.now() - start, { route: '/health/slow' });
    return resp;
  }

  @Get('health/error')
  healthError() {
    const start = Date.now();
    callsCounter.add(1, { route: '/health/error' });
    latencyHistogram.record(Date.now() - start, { route: '/health/error' });
    throw new Error('Test error for observability!');
  }
}
