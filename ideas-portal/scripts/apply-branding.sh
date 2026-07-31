#!/usr/bin/env bash
# ==========================================================================
# apply-branding.sh — Áp tùy biến cấp DB cho cổng đề xuất BTMH (idempotent).
# Chạy sau mỗi lần deploy. An toàn khi chạy lại nhiều lần.
#   - CSS gỡ thương hiệu Fider + bản quyền BTMH
#   - Chỉ cho đăng nhập bằng Google (tắt email auth)
#   - Bật provider Google (_google) cho tenant
#   - Đặt locale mặc định (giao diện đã Việt hóa qua overlay locale/en)
#   - Logo BTMH -> blob + logo_bkey
#   - Tên bảng: chỉ đặt khi chưa có (giữ tên CFO tự đặt trong Admin)
# ==========================================================================
set -euo pipefail

PGC="${PGC:-wg8owogscc4ogog8ccgw0ok8}"     # container Postgres BTMH
DB="${FIDER_DB:-fider}"
TENANT_ID="${TENANT_ID:-1}"
SITE_NAME="${SITE_NAME:-Đề xuất Cải tiến}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CSS_B64="$(base64 -w0 "$DIR/branding/custom.css")"
NAME_B64="$(printf '%s' "$SITE_NAME" | base64 -w0)"

# Bắt buộc (thương hiệu + bảo mật): CSS gỡ-Fider/bản quyền, chỉ Google-login, công khai, locale VN.
docker exec "$PGC" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -c "
  UPDATE tenants SET
    custom_css            = convert_from(decode('$CSS_B64','base64'),'UTF8'),
    is_email_auth_allowed = false,
    is_private            = false,
    locale                = 'en'
  WHERE id = $TENANT_ID;"

# Tên bảng: CHỈ đặt khi chưa có (init lần đầu / mặc định Fider) — để CFO tự đổi trong
# Admin -> General mà KHÔNG bị deploy ghi đè. Tên hiện tại (nếu CFO đã đặt) được giữ nguyên.
docker exec "$PGC" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -c "
  UPDATE tenants SET name = convert_from(decode('$NAME_B64','base64'),'UTF8')
  WHERE id = $TENANT_ID AND (name IS NULL OR name = '' OR name = 'Fider');"

docker exec "$PGC" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -c "
  INSERT INTO tenant_providers (tenant_id, provider, is_enabled)
  VALUES ($TENANT_ID, '_google', true)
  ON CONFLICT (tenant_id, provider) DO UPDATE SET is_enabled = true;"

# Logo BTMH: upsert blob + logo_bkey (thay og:image/header/favicon Fider mặc định).
# Nguồn ưu tiên = branding/logo.parts (logo BTMH THẬT, base64 CHIA PHẦN trong git =
# truyền byte-chuẩn). Ghép + giải mã ra logo.png mỗi lần deploy. Fallback: gen-logo.py.
LOGO_PNG="$DIR/branding/logo.png"
LOGO_PARTS="$DIR/branding/logo.parts"     # logo BTMH thật, base64 CHIA PHẦN (part-00..)
LOGO_SRC_B64="$DIR/branding/logo.b64"     # (dự phòng) base64 1 file
LOGO_KEY="logos/btmh-logo.png"
if [ -d "$LOGO_PARTS" ]; then
  # Ghép các phần theo thứ tự (glob tự sort part-00..part-NN) rồi giải mã. base64 -d bỏ qua
  # xuống dòng nên kể cả mỗi phần có \n ở cuối vẫn giải mã đúng.
  cat "$LOGO_PARTS"/part-* | base64 -d > "$LOGO_PNG"
elif [ -f "$LOGO_SRC_B64" ]; then
  base64 -d "$LOGO_SRC_B64" > "$LOGO_PNG"
elif [ ! -f "$LOGO_PNG" ]; then
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
