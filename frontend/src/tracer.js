import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'; 
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'; 
import { resourceFromAttributes } from '@opentelemetry/resources';

const initTracer = () => {
  // ✅ 1. 목적지(Exporter)를 먼저 생성합니다.
  const exporter = new OTLPTraceExporter({
    url: 'https://monitor.dev-uk.shop/otel/v1/traces',
  });

  // ✅ 2. Provider를 생성할 때 spanProcessors 배열에 주입합니다.
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'flight-frontend',
    }),
    // 👇 새롭게 추가된 설정 방식
    spanProcessors: [
      new BatchSpanProcessor(exporter)
    ],
  });

  // provider.addSpanProcessor(new BatchSpanProcessor(exporter)); <-- ❌ 이 줄은 삭제(또는 이미 주입했으므로 제거)
  provider.register();

  // 자동 계측 설정 (API 도메인 지정)
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