import tracer from 'dd-trace';

export function initDatadog() {
  if (process.env.DD_TRACE_ENABLED === 'false') {
    console.log('Datadog tracing disabled via DD_TRACE_ENABLED=false');
    return;
  }

  if (!process.env.DD_API_KEY) {
    console.log('Datadog API key not configured, skipping initialization');
    return;
  }

  tracer.init({
    service: process.env.DD_SERVICE || 'saaspe-backend',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version: process.env.DD_VERSION || '1.0.0',
    logInjection: true,
    runtimeMetrics: true,
    profiling: true,
    appsec: true,
  });

  console.log('Datadog APM initialized for service:', process.env.DD_SERVICE);
}

export { tracer };
