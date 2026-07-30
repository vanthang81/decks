#!/usr/bin/env bash
# ==========================================================================
# apply-branding.sh — Áp tùy biến cấp DB cho "Ý tưởng BTMH" (idempotent).
# Chạy sau mỗi lần deploy. An toàn khi chạy lại nhiều lần.
#   - Tên trang, CSS gỡ thương hiệu Fider + bản quyền BTMH
#   - Chỉ cho đăng nhập bằng Google (tắt email auth)
#   - Bật provider Google (_google) cho tenant
#   - Logo BTMH (sinh trên VPS) -> blob + logo_bkey
# ==========================================================================
set -euo pipefail

PGC="${PGC:-wg8owogscc4ogog8ccgw0ok8}"     # container Postgres BTMH
DB="${FIDER_DB:-fider}"
TENANT_ID="${TENANT_ID:-1}"
SITE_NAME="${SITE_NAME:-Ý tưởng BTMH}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CSS_B64="$(base64 -w0 "$DIR/branding/custom.css")"
NAME_B64="$(printf '%s' "$SITE_NAME" | base64 -w0)"

docker exec "$PGC" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -c "
  UPDATE tenants SET
    name                  = convert_from(decode('$NAME_B64','base64'),'UTF8'),
    custom_css            = convert_from(decode('$CSS_B64','base64'),'UTF8'),
    is_email_auth_allowed = false,
    is_private            = false,
    locale                = 'en'
  WHERE id = $TENANT_ID;"

docker exec "$PGC" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -c "
  INSERT INTO tenant_providers (tenant_id, provider, is_enabled)
  VALUES ($TENANT_ID, '_google', true)
  ON CONFLICT (tenant_id, provider) DO UPDATE SET is_enabled = true;"

# Logo BTMH: sinh xác định trên VPS (tránh lỗi truyền base64) rồi upsert blob + logo_bkey
# (thay og:image/header/favicon Fider mặc định). Logo được cache tại branding/logo.png.
LOGO_PNG="$DIR/branding/logo.png"
LOGO_KEY="logos/btmh-logo.png"
if [ ! -f "$LOGO_PNG" ]; then
  docker run --rm -v "$DIR:/w" python:3-slim bash -c \
    "apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq fonts-dejavu-core >/dev/null 2>&1 && pip install -q Pillow >/dev/null 2>&1 && python /w/scripts/gen-logo.py /w/branding/logo.png" || true
fi
if [ -f "$LOGO_PNG" ]; then
  LOGO_B64="$(base64 -w0 "$LOGO_PNG")"
  LOGO_SIZE="$(wc -c < "$LOGO_PNG")"
  docker exec "$PGC" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -c "
    INSERT INTO blobs (key, tenant_id, size, content_type, file, created_at, modified_at)
    VALUES ('$LOGO_KEY', $TENANT_ID, $LOGO_SIZE, 'image/png', decode('$LOGO_B64','base64'), now(), now())
    ON CONFLICT (tenant_id, key) DO UPDATE
      SET file = EXCLUDED.file, size = EXCLUDED.size,
          content_type = EXCLUDED.content_type, modified_at = now();"
  docker exec "$PGC" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -c "
    UPDATE tenants SET logo_bkey = '$LOGO_KEY' WHERE id = $TENANT_ID;"
fi

echo "apply-branding: done"
