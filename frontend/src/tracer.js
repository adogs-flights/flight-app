import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
// ✅ 1. 구형 SemanticResourceAttributes 대신 개별 상수인 ATTR_SERVICE_NAME을 가져옵니다.
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'; 
// ✅ 2. SimpleSpanProcessor 대신 브라우저용 BatchSpanProcessor를 가져옵니다.
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'; 
import { resourceFromAttributes } from '@opentelemetry/resources';

const initTracer = () => {
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      // ✅ 3. 변경된 상수(ATTR_SERVICE_NAME)를 적용합니다.
      [ATTR_SERVICE_NAME]: 'flight-frontend',
    }),
  });

  // 목적지 설정
  const exporter = new OTLPTraceExporter({
    url: 'https://monitor.dev-uk.shop/otel/v1/traces',
  });

  // ✅ 4. 브라우저 환경의 Best Practice인 BatchSpanProcessor로 변경합니다.
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();

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