import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const initTracer = () => {
  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'flight-frontend', // 서비스 이름
    }),
  });

  // 1. 목적지 설정 (Nginx를 통해 Tempo로 전송)
  const exporter = new OTLPTraceExporter({
    url: 'https://monitor.dev-uk.shop/otel/v1/traces',
  });

  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register();

  // 2. Fetch/XHR 자동 계측 (백엔드와 Trace ID를 공유하는 핵심 로직)
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          // 정확한 API 도메인을 지정합니다. 
          // 문자열이나 정규표현식 모두 가능합니다.
          propagateTraceHeaderCorsUrls: [
            /adogs-flight\.shop/g, // 이 도메인으로 가는 모든 fetch 요청에 헤더 주입
          ],
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          propagateTraceHeaderCorsUrls: [
            /adogs-flight\.shop/g, // Axios 등을 사용한다면 이 설정도 필요합니다.
          ],
        },
      }),
    ],
  });
};

export default initTracer;