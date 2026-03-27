# 1단계: React 앱 빌드
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2단계: 가벼운 정적 파일 서버(serve)로 구동
FROM node:20-alpine
WORKDIR /app
# serve 전역 설치
RUN npm install -g serve
# 빌드된 dist 폴더만 복사
COPY --from=build /app/dist ./dist

EXPOSE 3010
# 3010번 포트로 SPA 모드(-s) 서빙
CMD ["serve", "-s", "dist", "-l", "3010"]