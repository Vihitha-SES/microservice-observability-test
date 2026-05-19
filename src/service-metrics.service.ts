import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import {
  PerformanceObserver,
  constants as PerformanceConstants,
  monitorEventLoopDelay,
} from 'node:perf_hooks';

@Injectable()
export class ServiceMetricsService implements OnModuleDestroy {
  private healthUp = 1;
  private readiness = 1;
  private liveness = 1;

  private gcRunsTotal = 0;
  private gcDurationTotalMs = 0;

  private readonly eventLoopDelayHistogram = monitorEventLoopDelay({
    resolution: 20,
  });
  private gcObserver?: PerformanceObserver;

  private lastCpuSample = process.cpuUsage();
  private lastCpuSampleAt = Date.now();
  private cpuUsagePercent = 0;

  constructor() {
    const meter = metrics.getMeter('service-runtime-metrics');

    this.eventLoopDelayHistogram.enable();
    this.startGcObserver();

    meter
      .createObservableGauge('service_uptime_seconds', {
        description: 'Service uptime in seconds since process start',
      })
      .addCallback((result) => {
        result.observe(this.getUptimeSeconds());
      });

    meter
      .createObservableGauge('service_health_up', {
        description: 'Service health status (1=healthy, 0=unhealthy)',
      })
      .addCallback((result) => {
        result.observe(this.healthUp);
      });

    meter
      .createObservableGauge('service_readiness', {
        description: 'Service readiness status (1=ready, 0=not ready)',
      })
      .addCallback((result) => {
        result.observe(this.readiness);
      });

    meter
      .createObservableGauge('service_liveness', {
        description: 'Service liveness status (1=alive, 0=not alive)',
      })
      .addCallback((result) => {
        result.observe(this.liveness);
      });

    meter
      .createObservableGauge('process_memory_rss_bytes', {
        description: 'Resident set size memory in bytes',
      })
      .addCallback((result) => {
        result.observe(process.memoryUsage().rss);
      });

    meter
      .createObservableGauge('process_memory_heap_used_bytes', {
        description: 'Heap used memory in bytes',
      })
      .addCallback((result) => {
        result.observe(process.memoryUsage().heapUsed);
      });

    meter
      .createObservableGauge('process_memory_heap_total_bytes', {
        description: 'Heap total memory in bytes',
      })
      .addCallback((result) => {
        result.observe(process.memoryUsage().heapTotal);
      });

    meter
      .createObservableGauge('process_cpu_usage_percent', {
        description: 'CPU usage percent based on process CPU time deltas',
      })
      .addCallback((result) => {
        result.observe(this.sampleCpuUsagePercent());
      });

    meter
      .createObservableGauge('nodejs_eventloop_delay_ms', {
        description: 'Mean event loop delay in milliseconds',
      })
      .addCallback((result) => {
        result.observe(this.eventLoopDelayHistogram.mean / 1_000_000);
      });

    meter
      .createObservableGauge('nodejs_gc_runs_total', {
        description: 'Total number of observed GC runs',
      })
      .addCallback((result) => {
        result.observe(this.gcRunsTotal);
      });

    meter
      .createObservableGauge('nodejs_gc_duration_total_ms', {
        description: 'Total observed GC duration in milliseconds',
      })
      .addCallback((result) => {
        result.observe(this.gcDurationTotalMs);
      });
  }

  markLiveness(isAlive: boolean): void {
    this.liveness = isAlive ? 1 : 0;
    this.healthUp = this.liveness && this.readiness ? 1 : 0;
  }

  markReadiness(isReady: boolean): void {
    this.readiness = isReady ? 1 : 0;
    this.healthUp = this.liveness && this.readiness ? 1 : 0;
  }

  getUptimeSeconds(): number {
    return process.uptime();
  }

  onModuleDestroy(): void {
    this.eventLoopDelayHistogram.disable();
    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = undefined;
    }
  }

  private sampleCpuUsagePercent(): number {
    const now = Date.now();
    const cpuNow = process.cpuUsage();

    const elapsedWallMs = now - this.lastCpuSampleAt;
    if (elapsedWallMs <= 0) {
      return this.cpuUsagePercent;
    }

    const deltaUserUs = cpuNow.user - this.lastCpuSample.user;
    const deltaSystemUs = cpuNow.system - this.lastCpuSample.system;
    const elapsedCpuUs = deltaUserUs + deltaSystemUs;

    this.cpuUsagePercent = (elapsedCpuUs / (elapsedWallMs * 1000)) * 100;

    this.lastCpuSample = cpuNow;
    this.lastCpuSampleAt = now;

    return this.cpuUsagePercent;
  }

  private startGcObserver(): void {
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          this.gcRunsTotal += 1;
          this.gcDurationTotalMs += entry.duration;

          const gcKind = (entry as PerformanceEntry & { detail?: { kind?: number } }).detail?.kind;
          if (gcKind === PerformanceConstants.NODE_PERFORMANCE_GC_MAJOR) {
            // Intentionally no-op: details are tracked in totals only.
          }
        }
      });

      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch {
      this.gcObserver = undefined;
    }
  }
}