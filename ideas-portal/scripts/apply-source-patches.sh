#!/usr/bin/env bash
# ==========================================================================
# apply-source-patches.sh — Áp patch source Fider TRƯỚC khi build.
# Patch: tự động lấy avatar Google (OAuth `picture`) khi user đăng nhập lần đầu.
# Chạy trên source pristine (deploy.sh vừa `git reset --hard` fider-src) nên KHÔNG
# cần idempotent. Nếu Fider đổi cấu trúc làm perl không khớp -> file không đổi ->
# build/compile sẽ báo lỗi (tín hiệu cần cập nhật patch khi bump FIDER_REF).
# ==========================================================================
set -euo pipefail
SRC="${1:-/home/thang/fider-src}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1) Thêm file helper vào package handlers
cp "$DIR/patches/oauth_avatar.go" "$SRC/app/handlers/oauth_avatar.go"

# 2) Thêm field Avatar vào dto.OAuthUserProfile (trước field Roles)
perl -0pi -e 's/(\n\tRoles \[\]string)/\n\tAvatar string `json:"avatar"`$1/' "$SRC/app/models/dto/oauth.go"

# 3) Parse trường "picture" -> Avatar trong parseOAuthRawProfile (trước Roles: roles,)
perl -0pi -e 's/(\n\t\tRoles: roles,)/\n\t\tAvatar: strings.TrimSpace(query.String("picture")),$1/' "$SRC/app/services/oauth/oauth.go"

# 4) Gọi importOAuthAvatar trước khi set cookie trong OAuthToken
perl -0pi -e 's/(\n\t\twebutil\.AddAuthUserCookie\(c, user\))/\n\t\timportOAuthAvatar(c, user, oauthUser.Result.Avatar)$1/' "$SRC/app/handlers/oauth.go"

# Kiểm tra patch đã ăn (thất bại sớm nếu anchor không khớp sau khi bump FIDER_REF)
grep -q 'Avatar string' "$SRC/app/models/dto/oauth.go"        || { echo "PATCH FAIL: dto.Avatar"; exit 1; }
grep -q 'query.String("picture")' "$SRC/app/services/oauth/oauth.go" || { echo "PATCH FAIL: parse picture"; exit 1; }
grep -q 'importOAuthAvatar(c, user' "$SRC/app/handlers/oauth.go" || { echo "PATCH FAIL: call site"; exit 1; }

echo "apply-source-patches: done"
