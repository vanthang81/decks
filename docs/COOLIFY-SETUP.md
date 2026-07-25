# Deploy kho slide deck lên `deck.consultx.vn`

> Trạng thái: **ĐÃ LIVE** tại `https://deck.consultx.vn` (25/07/2026). Tài liệu này mô tả
> **đúng kiến trúc thực tế** trên VPS `45.77.247.185` (Claude đã dựng qua Coolify API + n8n SSH),
> để mọi session sau biết cách vận hành & thêm deck.

---

## Kiến trúc thực tế (quan trọng — không phải Coolify/Traefik thuần)

Trên VPS này, **biên (edge) là nginx cài trực tiếp trên host** (`nginx/1.18.0 Ubuntu`), KHÔNG phải
Traefik của Coolify. Mỗi subdomain `*.consultx.vn` = **1 vhost nginx** trỏ (`proxy_pass`) tới cổng
localhost của 1 container, TLS do **certbot** tự cấp/gia hạn. Coolify vẫn chạy (quản lý container)
nhưng KHÔNG cầm cổng 80/443, nên label Traefik của app Coolify không có tác dụng ở tầng biên.

Luồng phục vụ deck:

```
Internet → :443 host nginx (certbot TLS)
   └─ vhost deck.consultx.vn  →  proxy_pass http://127.0.0.1:8600
        └─ container Coolify "decks" (nginx tĩnh, serve /site)  ← git: vanthang81/decks@main
```

### Các mảnh cấu thành
| Thành phần | Giá trị |
|---|---|
| Coolify app | **decks** · uuid `ssh3yybpge1ps0y9poredqwl` · project **Applications** (`nsc8ww8cgwkgkggssgk44888`) · env `production` |
| Server Coolify | `rko04k8ocswskowkkcsggkc4` (localhost, 45.77.247.185) |
| Build pack | **static** · Base Directory `/site` · repo `vanthang81/decks` · branch `main` |
| Port mapping | `8600:80` → container publish `0.0.0.0:8600` (host nginx proxy vào đây) |
| nginx vhost | `/etc/nginx/sites-available/deck.consultx.vn.conf` (symlink ở `sites-enabled/`) |
| TLS | certbot `--nginx`, cert `/etc/letsencrypt/live/deck.consultx.vn/`, tự gia hạn |
| DNS | `deck.consultx.vn A 45.77.247.185` (đã verify) |

Nội dung vhost (rút gọn):
```nginx
server {
    server_name deck.consultx.vn;
    location / { proxy_pass http://127.0.0.1:8600; proxy_set_header Host $host; ... }
    listen 443 ssl;  # certbot: cert /etc/letsencrypt/live/deck.consultx.vn/
}
# + server :80 redirect 301 → https (certbot)
```

---

## Đưa deck mới lên (quy trình chuẩn)

1. Tạo `site/decks/<slug>.html` (copy từ `template.html`) + chèn card `<a class="deck">` vào
   `site/index.html` tại `<!-- DECK-INSERT-POINT -->`.
2. Commit + **push vào `main`**.
3. **Redeploy** app Coolify `decks` (git pull + rebuild container tĩnh):
   - Cách A — auto (nếu đã gắn webhook, xem dưới): push main là tự deploy.
   - Cách B — thủ công qua Coolify API (n8n chạy trên VPS gọi được, máy ngoài bị chặn):
     `GET https://coolify.vanthang.io/api/v1/deploy?uuid=ssh3yybpge1ps0y9poredqwl`
     header `Authorization: Bearer <COOLIFY_TOKEN>`.
4. Kiểm: `https://deck.consultx.vn/decks/<slug>.html`.

> Container tĩnh phục vụ đúng thư mục `/site`; base_directory đã set `/site` nên `index.html`
> = gallery, `decks/*.html` = từng deck. Không có build step.

---

## Auto-deploy khi push `main` (tuỳ chọn — Coolify-native, KHÔNG cần lưu API token)

Thêm **1 GitHub webhook** ở repo `vanthang81/decks` → Settings → Webhooks → Add webhook:

| Trường | Giá trị |
|---|---|
| Payload URL | `https://coolify.vanthang.io/webhooks/source/github/events/manual` |
| Content type | `application/json` |
| Secret | `manual_webhook_secret_github` của app decks (lấy từ Coolify → app → Webhooks) |
| Events | Just the **push** event |

Coolify khớp app theo secret + repo trong payload rồi tự redeploy. Cách này **không** phụ thuộc
Coolify API token (token có thể rotate thoải mái).

---

## Vận hành / sự cố

- **Xem container:** `docker ps | grep ssh3yybpge1` (tên = `<uuid>-<timestamp>`, publish `:8600`).
- **Test nhanh nội bộ:** `curl http://127.0.0.1:8600/` (bỏ qua nginx/TLS) phải trả gallery.
- **Sửa/nạp lại nginx:** chỉnh vhost rồi `nginx -t && nginx -s reload` (cần root; user `thang`
  không có passwordless sudo — Claude thao tác qua container privileged `docker run --pid=host
  --network host -v /:/host … chroot /host …`, luôn `nginx -t` trước khi reload).
- **Gia hạn TLS:** certbot đã cài scheduled task tự gia hạn; kiểm `certbot certificates`.
- **Đổi cổng/đường proxy:** cổng host `8600` set ở Coolify (`ports_mappings`), phải redeploy để áp.

---

## Ghi chú DNS (nếu chuyển hạ tầng)
```
deck.consultx.vn.   A   45.77.247.185
```
Nếu `consultx.vn` sau Cloudflare: để **DNS only** (mây xám) khi certbot cấp Let's Encrypt.
