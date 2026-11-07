# gallery.zanviq.dev — 빌드 단계 없는 정적 사이트를 nginx 로 서빙한다.
# TwoMES Hosting dockerfile 방식: 포트 8080 하나, 라즈베리파이(arm64)에서 직접 빌드.
FROM nginxinc/nginx-unprivileged:1.28-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# 배포 대상만 명시적으로 복사한다. design/ (시안), README 등은 들어가지 않는다.
COPY index.html favicon.ico /usr/share/nginx/html/
COPY assets/     /usr/share/nginx/html/assets/
COPY data/       /usr/share/nginx/html/data/
COPY works/      /usr/share/nginx/html/works/
COPY thumbnails/ /usr/share/nginx/html/thumbnails/
COPY og/         /usr/share/nginx/html/og/
COPY shared/     /usr/share/nginx/html/shared/

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
