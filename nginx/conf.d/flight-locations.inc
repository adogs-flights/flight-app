# 공개(443)·로컬(8080) 종단이 공유하는 라우팅 정의.
# nginx.conf는 conf.d/*.conf만 자동 포함하므로 이 파일은 server 블록에서
# 명시적으로 include될 때만 적용된다.

location = /nginx-health {
    access_log off;
    return 204;
}

location /api {
    set $flight_backend http://flight-backend:8010;
    proxy_pass $flight_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
}

location = /privacy {
    try_files /privacy.html =404;
}

location = /terms {
    try_files /terms.html =404;
}

location / {
    set $flight_frontend http://flight-frontend:3010;
    proxy_pass $flight_frontend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
}
