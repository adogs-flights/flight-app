import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources'; // ✅ 대체 함수 임포트

const initTracer = () => {
  const provider = new WebTracerProvider({
    // ✅ new Resource() 대신 resourceFromAttributes() 함수 사용
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'flight-frontend',
    }),
  });

  // 1. 목적지 설정 (Nginx를 통해 Tempo로 전송)
  const exporter = new OTLPTraceExporter({
    url: 'https://monitor.dev-uk.shop/otel/v1/traces',
  });

  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register();

  // 2. 자동 계측 설정 (API 도메인 지정)
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: [/adogs-flight\.shop/g], 
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          propagateTraceHeaderCorsUrls: [/adogs-flight\.shop/g], 
        },
      }),
    ],
  });
};

export default initTracer;