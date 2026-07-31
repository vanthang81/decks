#!/usr/bin/env bash
# Deploy decks-portal — build 1 image, chạy 2 container (đa domain), mỗi domain 1 AUTH_URL + Google client.
#   - decks-portal-staging  : deck.consultx.vn  (:8610, --env-file .env)          client 655980 (C1)
#   - decks-portal-vanthang : deck.vanthang.io  (:8611, --env-file .env.vanthang) client 717726 (C2)
# nginx: deck.consultx.vn -> 8610 ; deck.vanthang.io -> 8611 ; /mcp (cả 2) -> 8620.
# LƯU Ý: deploy PHẢI khởi động lại CẢ HAI container từ cùng image mới — nếu chỉ restart 1 cái thì
# domain kia sẽ chạy code cũ. Auth.js KHÔNG suy được host qua trustHost trong standalone (ra 0.0.0.0),
# nên BẮT BUỘC mỗi container ghim AUTH_URL riêng; .env (consultx) và .env.vanthang (vanthang) ngoài git.
# KHÔNG dùng `set -e`: đua tên container (cosmetic) không được làm hỏng cả deploy — mỗi container tự
# teardown vững + retry, rồi kiểm health. pipefail để bắt lỗi build.
set -uo pipefail
cd /home/thang/decks-portal

git fetch origin main -q && git reset --hard -q origin/main
echo "HEAD=$(git rev-parse --short HEAD)"

docker build -t decks-portal:latest . || { echo "BUILD_FAIL — giữ nguyên container cũ"; exit 1; }

run_one() {
  local name="$1" envfile="$2" port="$3"
  # Teardown vững: xoá tới khi thực sự biến mất (tránh đua tên khi tạo lại).
  docker rm -f "$name" >/dev/null 2>&1 || true
  for i in $(seq 1 30); do
    [ -z "$(docker ps -aqf name=^${name}$)" ] && break
    docker rm -f "$name" >/dev/null 2>&1 || true; sleep 1
  done
  # Chạy; nếu vẫn đụng tên (đua) thì xoá lại + thử lần nữa.
  docker run -d --name "$name" --env-file "$envfile" --add-host=host.docker.internal:host-gateway \
    -p "127.0.0.1:${port}:3000" --restart unless-stopped decks-portal:latest >/dev/null 2>&1 || {
      docker rm -f "$name" >/dev/null 2>&1 || true; sleep 2
      docker run -d --name "$name" --env-file "$envfile" --add-host=host.docker.internal:host-gateway \
        -p "127.0.0.1:${port}:3000" --restart unless-stopped decks-portal:latest >/dev/null 2>&1
    }
  for i in $(seq 1 25); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' -m4 http://127.0.0.1:${port}/login)" = 200 ] && { echo "$name up on :$port"; return 0; }
    sleep 2
  done
  echo "WARN: $name chưa lên trên :$port"; return 1
}

run_one decks-portal-staging  .env          8610
run_one decks-portal-vanthang .env.vanthang 8611
echo "deployed both containers"
