#!/usr/bin/env bash
# ==========================================================================
# deploy.sh — Build & triển khai "Ý tưởng BTMH" (Fider Việt hóa) trên VPS.
#
# Việt hóa client là do webpack BIÊN DỊCH lúc build (chunk locale-*-client-json),
# nên KHÔNG thể overlay file lúc chạy — phải BUILD LẠI TỪ SOURCE với locale tiếng Việt.
# Script này:
#   1) Cập nhật source Fider (fider-src) tại commit ghim (FIDER_REF)
#   2) Ghi đè locale mặc định en bằng bản dịch tiếng Việt trong repo này
#   2b) Áp patch source (tự lấy avatar Google)
#   3) docker build bằng Dockerfile CHÍNH CHỦ của Fider  ->  ideas-portal:latest
#   4) Recreate container(s) (giữ .env ngoài git)
#   5) Áp lại tùy biến cấp DB (tên/logo/CSS gỡ-Fider/bản quyền/Google-only)
#
# Tùy biến được BẢO TOÀN qua mỗi update:
#   - Việt hóa + patch: overlay/patch lại trước khi build
#   - Tên/logo/CSS/bản quyền/Google: nằm ở Postgres (không đụng khi update)
# ==========================================================================
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH

APP_DIR="${APP_DIR:-/home/thang/ideas-portal}"     # repo tùy biến (chứa .env)
SRC_DIR="${SRC_DIR:-/home/thang/fider-src}"        # source Fider (build context)
IMAGE="${IMAGE:-ideas-portal:latest}"
CONTAINER="${CONTAINER:-ideas-portal}"
PORT="${PORT:-127.0.0.1:8630}"
FIDER_REPO="${FIDER_REPO:-https://github.com/getfider/fider.git}"
# Ghim commit để khớp schema DB đang chạy; đổi giá trị này để nâng cấp Fider.
FIDER_REF="${FIDER_REF:-67c52826cca176724a59dd58b9795e1bc8d67bc8}"

echo "[1/5] Cập nhật source Fider ($FIDER_REF)..."
if [ ! -d "$SRC_DIR/.git" ]; then
  git clone -q "$FIDER_REPO" "$SRC_DIR"
fi
cd "$SRC_DIR"
git fetch -q origin
git checkout -q "$FIDER_REF"
git reset --hard -q "$FIDER_REF"

echo "[2/5] Việt hóa (overlay locale en)..."
cp "$APP_DIR/locale/en/client.json" "$SRC_DIR/locale/en/client.json"
cp "$APP_DIR/locale/en/server.json" "$SRC_DIR/locale/en/server.json"

echo "[2b] Áp patch source (tự lấy avatar Google)..."
bash "$APP_DIR/scripts/apply-source-patches.sh" "$SRC_DIR"

echo "[3/5] Build image (Dockerfile chính chủ Fider + locale VN)..."
docker build -t "$IMAGE" "$SRC_DIR"

echo "[4/5] Recreate container(s)..."
# Container chính: ideas.consultx.vn (chứa migrate)
docker rm -f "$CONTAINER" 2>/dev/null || true
docker run -d --name "$CONTAINER" \
  --env-file "$APP_DIR/.env" \
  --add-host=host.docker.internal:host-gateway \
  -p "${PORT}:3000" \
  --restart unless-stopped \
  "$IMAGE"

# Container phụ (tùy chọn): ideas.vanthang.io — CHUNG database, BASE_URL riêng, client Google riêng.
# Bỏ qua migrate (dùng "./fider") vì container chính đã migrate DB dùng chung.
if [ -f "$APP_DIR/.env.vanthang" ]; then
  docker rm -f ideas-portal-vanthang 2>/dev/null || true
  docker run -d --name ideas-portal-vanthang \
    --env-file "$APP_DIR/.env.vanthang" \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:8631:3000 \
    --restart unless-stopped \
    "$IMAGE" ./fider
fi
docker image prune -f >/dev/null 2>&1 || true

echo "[5/5] Áp lại tùy biến cấp DB..."
sleep 5
bash "$APP_DIR/scripts/apply-branding.sh"

echo "IDEAS_DEPLOY_DONE"
