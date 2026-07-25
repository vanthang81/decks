# Deploy kho slide deck lên `deck.consultx.vn` (Coolify Static Site)

Mục tiêu: mỗi lần push HTML vào repo là Coolify tự build + deploy, tự cấp SSL.
Thư mục web root là **`site/`** trong repo này.

---

## 0. DNS (làm 1 lần)

Thêm bản ghi A trỏ subdomain về VPS:

```
deck.consultx.vn.   A   45.77.247.185
```

> Nếu `consultx.vn` đang sau Cloudflare: để **DNS only** (mây xám) khi Coolify
> tự cấp Let's Encrypt lần đầu, xong bật proxy lại nếu muốn. Hoặc dùng SSL
> Full ở Cloudflare.

---

## 1. Tạo resource trong Coolify

1. Coolify → chọn **Project** (hoặc tạo project `decks`) → **+ New Resource**.
2. Chọn nguồn Git:
   - Nếu đã kết nối GitHub App: chọn **Public/Private Repository** → `vanthang81/decks`.
   - Hoặc **Based on a Git Repository** → dán URL repo.
3. **Branch:** `main` (nhánh production Coolify theo dõi — deploy được ngay).
4. **Build Pack:** chọn **Static** (không cần Nixpacks/Dockerfile).

## 2. Cấu hình build

| Trường | Giá trị |
|---|---|
| **Base Directory** | `/site` |
| **Publish Directory** | `/site` (hoặc để trống nếu Base Directory đã là `/site`) |
| **Is it a SPA?** | No (đây là nhiều file .html tĩnh) |
| **Install/Build command** | *(để trống — không có bước build)* |

> Bản chất: Coolify sẽ serve nội dung thư mục `site/` bằng nginx tĩnh.
> `site/index.html` → trang gallery; `site/decks/*.html` → từng deck.

## 3. Domain + SSL

1. Tab **Domains** của resource → nhập: `https://deck.consultx.vn`
2. Bật **Generate SSL** (Let's Encrypt) — Coolify + Traefik lo phần chứng chỉ.
3. **Deploy**.

## 4. Kiểm tra

- `https://deck.consultx.vn/` → trang gallery.
- `https://deck.consultx.vn/decks/template.html` → deck mẫu.

## 5. Auto-deploy các lần sau

Trong resource → bật **Auto Deploy** và (nếu dùng GitHub App) Coolify tự cắm
webhook. Từ đó: **push/merge vào branch phát hành → deck tự lên**, không cần
mở máy tính — đúng như pattern `PE Deploy` bạn đang chạy cho price-engine.

---

## Luồng làm việc sau khi đã setup

1. Bạn nhắn Claude: *"tạo deck về &lt;chủ đề&gt;"*.
2. Claude sinh `site/decks/<slug>.html` + thêm card vào `site/index.html`.
3. Commit → push/merge vào branch phát hành.
4. Coolify auto-deploy → link `https://deck.consultx.vn/decks/<slug>.html`.

---

## Phương án thay thế (nếu sau khi xem Coolify bạn muốn kiểu PE Deploy)

Thay vì Static Site, nhân bản workflow **PE Deploy** (`3hrAk9aWGFTy6ARX`):
GitHub push → webhook n8n → SSH vào VPS (`thang@45.77.247.185`) →
`git pull` vào một thư mục được nginx/Traefik serve tĩnh. Báo Claude nếu chọn
hướng này, sẽ xuất sẵn workflow JSON để import.
