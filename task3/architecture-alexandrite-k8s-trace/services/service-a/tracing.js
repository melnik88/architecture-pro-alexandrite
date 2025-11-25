const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

// Настройка OpenTelemetry
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'service-a',
  })
);

const provider = new NodeTracerProvider({
  resource: resource,
});

const jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://simplest-collector.default.svc.cluster.local:4318/v1/traces';
const exporter = new OTLPTraceExporter({
  url: jaegerEndpoint,
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Регистрация инструментаций ПЕРЕД импортом express и axios
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation({
      // Включить автоматическую propagation
      requestHook: (span, request) => {
        span.setAttribute('http.target', request.path);
      },
    }),
    new ExpressInstrumentation(),
  ],
});

console.log('OpenTelemetry tracing initialized for service-a');
