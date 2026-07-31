#!/usr/bin/env bash
# Deploy decks-portal — build 1 image, chạy 2 container (đa domain), mỗi domain 1 AUTH_URL + Google client.
#   - decks-portal-staging  : deck.consultx.vn  (:8610, --env-file .env)          client 655980 (C1)
#   - decks-portal-vanthang : deck.vanthang.io  (:8611, --env-file .env.vanthang) client 717726 (C2)
# nginx: deck.consultx.vn -> 8610 ; deck.vanthang.io -> 8611 ; /mcp (cả 2) -> 8620.
# LƯU Ý: deploy PHẢI khởi động lại CẢ HAI container từ cùng image mới — nếu chỉ restart 1 cái thì
# domain kia sẽ chạy code cũ. Auth.js KHÔNG suy được host qua trustHost trong standalone (ra 0.0.0.0),
# nên BẮT BUỘC mỗi container ghim AUTH_URL riêng; .env (consultx) và .env.vanthang (vanthang) ngoài git.
set -euo pipefail
cd /home/thang/decks-portal

git fetch origin main -q && git reset --hard -q origin/main
echo "HEAD=$(git rev-parse --short HEAD)"

docker build -t decks-portal:latest .

run_one() {
  local name="$1" envfile="$2" port="$3"
  docker rm -f "$name" >/dev/null 2>&1 || true
  for i in $(seq 1 20); do [ "$(docker ps -aqf name=$name | wc -l)" = 0 ] && break; sleep 1; done
  docker run -d --name "$name" --env-file "$envfile" \
    --add-host=host.docker.internal:host-gateway \
    -p "127.0.0.1:${port}:3000" --restart unless-stopped decks-portal:latest >/dev/null
  for i in $(seq 1 25); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' -m4 http://127.0.0.1:${port}/login)" = 200 ] && { echo "$name up on :$port"; return 0; }
    sleep 2
  done
  echo "WARN: $name chưa lên trên :$port"; return 1
}

run_one decks-portal-staging  .env          8610
run_one decks-portal-vanthang .env.vanthang 8611
echo "deployed both containers"
