# 공개 TLS 종단이 공유하는 설정. 인증서 경로만 server 블록에서 지정한다.
# nginx.conf는 conf.d/*.conf만 자동 포함하므로 이 파일은 명시적으로
# include될 때만 적용된다.

# ssl_session_cache는 두 server 블록이 같은 공유 영역 이름을 선언하게 되어
# 쓰지 않는다. 오리진 TLS는 Cloudflare와의 소수 연결이라 영향이 없다.
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

client_max_body_size 50M;
underscores_in_headers on;
root /usr/share/nginx/html;
resolver 127.0.0.11 valid=10s ipv6=off;
