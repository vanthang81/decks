# SOP — Tạo "slide deck A4 HTML" chuẩn BTMH

> Quy trình chuẩn để tạo **deck báo cáo A4 dạng HTML self-contained** theo phong cách MBB của Bảo Tín Mạnh Hải
> (BTMH), publish lên `deck.consultx.vn`. Áp cho báo cáo quản trị, nghiên cứu chuyên sâu, tài liệu dài đọc trên
> web **và** in ra A4.
>
> Đây **KHÔNG** phải deck slide 16:9 (`content/decks/template.html`). Deck A4 = 1 trang dài chia **section**,
> layout khổ A4, đọc cuộn trên web + in PDF A4 gọn. Deck mẫu chuẩn (canonical): `btmh-bcqt-a4-bridge-loi-nhuan-t1-t7-2026`.

---

## 0. Nguyên tắc bất biến

1. **Self-contained tuyệt đối** — 1 file `.html` duy nhất. **KHÔNG** CDN, **KHÔNG** webfont online, **KHÔNG**
   asset rời. Font + logo + ảnh + biểu đồ nhúng thẳng (font/logo = data-URI base64; biểu đồ = SVG inline).
   Lý do: portal chặn tải file rời, deck phải chạy offline và khi bị bọc watermark.
2. **Nội dung do người/Claude soạn — portal chỉ phục vụ.** Portal tự chèn watermark định danh, log, chặn
   tải/in, và "chrome" cải thiện (toàn màn hình, hướng dẫn, cuộn TOC, cỡ chữ iPad). Tác giả **không** tự làm mấy
   thứ đó.
3. **Phải có `#navdock`** (khối điều hướng tròn góc phải). Portal gate mọi cải thiện theo `#navdock`; thiếu nó thì
   mất fullscreen/hướng dẫn/tinh chỉnh iPad.
4. **Đọc được trên web + in A4 sạch.** Luôn kiểm cả 2: cuộn trên desktop/iPad/mobile, và In → PDF khổ A4.

---

## 1. Nguyên tắc nội dung (MBB / Pyramid)

- **Answer-first.** Mở đầu bằng KẾT LUẬN, rồi mới tới lập luận & bằng chứng. Section 01 luôn là "Kết luận điều hành".
- **Takeaway title.** Tiêu đề mỗi section là **một câu kết luận có thể đọc rời**, KHÔNG phải nhãn.
  - ✅ "Tăng trưởng lãi gộp đến từ biên nhiều hơn từ sản lượng"
  - ❌ "Phân tích lãi gộp"
- **MECE.** Các section/nhóm ý không chồng lấn, không bỏ sót.
- **Một section = một thông điệp.** Bằng chứng (bảng/biểu đồ/số) phục vụ đúng thông điệp đó.
- **Số liệu có nguồn.** Nêu kỳ dữ liệu, phạm vi (vd "công ty bán lẻ, loại SX/BN/HD"), ngày lập; ghi chú giả định.
- **KPI nổi bật đầu trang** — tối đa 4–5 chỉ số "một liếc là hiểu", có thể âm (đỏ) để cảnh báo.
- **Khuyến nghị hành động** ở cuối (ai làm gì, khi nào), không chỉ mô tả.

---

## 2. Hệ thống thiết kế (house style)

### 2.1 Bảng màu (`:root`)
| Biến | Mã | Vai trò |
|---|---|---|
| `--maroon` | `#7C0312` | Màu thương hiệu chính (band header, tiêu đề nhấn, nút) |
| `--maroon-dk` / `--maroon-ink` | `#5A0210` / `#3E020C` | Maroon đậm / nền hộp tối |
| `--gold` / `--gold-br` / `--gold-dp` | `#A6802B` / `#C9A64A` / `#8A6A22` | Vàng (đường kẻ, viền, số mục) |
| `--ivory` / `--paper` / `--sand` | `#FAF7F2` / `#FFFFFF` / `#F1EADE` | Nền kem / giấy / nền nhạt |
| `--ink` / `--muted` | `#241C1B` / `#6E6660` | Chữ chính / chữ phụ |
| `--line` / `--line-m` | `#E1D8CB` / `#D8C9B4` | Đường kẻ nhạt / đậm |
| `--red` / `--amber` / `--green` | `#B0271F` / `#C07A12` / `#3E7A4E` | Cảnh báo / chú ý / tích cực |

### 2.2 Font (nhúng data-URI, có fallback)
| Biến | Font | Dùng cho | Fallback |
|---|---|---|---|
| `--serif` | **Lora** | Tiêu đề `h1/h2`, lead | `Georgia, serif` |
| `--sans` | **Be Vietnam Pro** | Thân bài, band, nhãn | `system-ui, sans-serif` |
| `--mono` | **IBM Plex Mono** | Số mục, mã báo cáo, số liệu bảng | `Consolas, monospace` |

Nhúng bằng `@font-face { src: url("data:font/woff2;base64,…") format("woff2") }`. Nếu không có sẵn base64 font,
tạm dùng fallback hệ thống (`Georgia`/`system-ui`/`Consolas`) — vẫn ra đúng bố cục, chỉ khác chữ. **Đừng** link
Google Fonts (CDN bị chặn khi bọc watermark + phá tính self-contained).

---

## 3. Bộ khung file (scaffold)

Khung tối thiểu, giữ đúng khổ A4 + palette + các khối chuẩn. Điền nội dung vào; copy phần `#navdock` + JS điều
hướng từ deck mẫu `btmh-bcqt-a4-bridge-loi-nhuan-t1-t7-2026` (giữ nguyên `data-a`/id để portal + TOC hoạt động).

```html
<!doctype html><html lang="vi"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BTMH - <Tiêu đề> (báo cáo A4)</title>
<style>
  /* Font nhúng (thay data:… bằng base64 thật; bỏ qua nếu dùng fallback) */
  @font-face{font-family:'Lora';src:url("data:font/woff2;base64,…") format("woff2");font-weight:400 700;font-display:swap}
  @font-face{font-family:'Be Vietnam Pro';src:url("data:font/woff2;base64,…") format("woff2");font-weight:400 700;font-display:swap}
  @font-face{font-family:'IBM Plex Mono';src:url("data:font/woff2;base64,…") format("woff2");font-weight:500;font-display:swap}

  :root{
    --maroon:#7C0312;--maroon-dk:#5A0210;--maroon-ink:#3E020C;
    --gold:#A6802B;--gold-br:#C9A64A;--gold-dp:#8A6A22;
    --ivory:#FAF7F2;--paper:#FFFFFF;--sand:#F1EADE;
    --ink:#241C1B;--muted:#6E6660;--line:#E1D8CB;--line-m:#D8C9B4;
    --red:#B0271F;--amber:#C07A12;--green:#3E7A4E;
    --serif:'Lora',Georgia,serif;--sans:'Be Vietnam Pro',system-ui,sans-serif;--mono:'IBM Plex Mono',Consolas,monospace;
  }

  /* Khổ giấy khi in */
  @page{size:A4;margin:12mm 14mm 20mm 14mm}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{width:210mm;max-width:210mm;margin:0 auto;padding:12mm 14mm 20mm;background:var(--paper);
    color:var(--ink);font-family:var(--sans);font-size:9pt;line-height:1.5}

  /* Band tiêu đề (maroon) */
  .band{margin:0 -14mm;padding:4.2mm 14mm 4mm;background:var(--maroon);color:#F6ECEC;height:15mm;
    display:flex;justify-content:space-between;align-items:center;font-size:7pt}
  .band .lg{width:40mm;height:8mm;background:var(--gold-br)}/* thay bằng logo data-URI */
  .band .meta{text-align:right;line-height:1.4}
  .goldrule{height:1.5px;background:var(--gold);margin:2mm 0 4mm}

  /* Khối mở đầu */
  .eyebrow{font-size:7.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-dp)}
  h1.doctitle{font-family:var(--serif);font-size:20pt;line-height:1.2;margin:2mm 0;color:var(--maroon-ink)}
  .lead{font-size:9.5pt;color:var(--muted);margin:0 0 4mm}

  /* KPI (tối đa 4–5) */
  .kpis{display:table;width:100%;border-collapse:collapse;margin-bottom:4.4mm}
  .kpi{display:table-cell;width:25%;border:.6pt solid var(--line-m);background:var(--paper);padding:2.2mm 2.6mm;vertical-align:top}
  .kpi .v{font-family:var(--mono);font-size:13pt;font-weight:700;color:var(--maroon)}
  .kpi .v.neg{color:var(--red)}
  .kpi .v small{font-size:8pt;color:var(--muted)}
  .kpi .l{font-size:7pt;color:var(--muted);margin-top:1mm}

  /* Section + tiêu đề takeaway đánh số */
  section{margin-bottom:6mm}
  section>h2{font-family:var(--serif);font-size:12.5pt;color:var(--maroon-ink);margin:0 0 2mm;
    border-bottom:1.2pt solid var(--gold-br);padding-bottom:1mm}
  section>h2 .n{font-family:var(--mono);font-size:9pt;color:var(--gold-dp);margin-right:6px}
  .box.dark{background:var(--maroon-ink);color:#F6ECEC;padding:2.4mm 3mm;margin-bottom:2.6mm;font-size:8.5pt}

  /* Bảng — bọc .tw để cuộn ngang khi rộng */
  .tw{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:7.6pt;margin-bottom:2.4mm}
  th,td{border:.5pt solid var(--line);padding:1mm 1.6mm;text-align:left;vertical-align:top}
  thead th{background:var(--sand);color:var(--maroon-ink);font-weight:700}

  /* Biểu đồ (SVG inline) — tránh cắt trang khi in */
  .fig{margin:0 0 2.6mm;padding:1.6mm 2mm;border:.5pt solid var(--line);background:var(--paper);page-break-inside:avoid}
  .fig figcaption{font-size:7pt;color:var(--muted);margin-top:1mm}

  /* Hai cột */
  .two{display:table;width:100%;table-layout:fixed;margin-bottom:2.6mm}
  .two>div{display:table-cell;width:50%;vertical-align:top;padding-right:4mm}

  /* Nhãn + thuật ngữ */
  .tag{display:inline-block;font-size:6.2pt;font-weight:700;padding:.5mm 1.6mm;background:var(--sand);
    color:var(--gold-dp);text-transform:uppercase;letter-spacing:.06em}
  .gl{border-bottom:1px dotted var(--gold-dp);cursor:help}/* thuật ngữ: <span class="gl" data-def="…">…</span> */

  /* Cỡ chữ theo màn hình (portal tự lo iPad = 1.32) */
  @media screen and (min-width:1120px){html{zoom:1.35}}      /* desktop: phóng cho dễ đọc */
  @media screen and (max-width:820px){html{zoom:1.30}         /* mobile */
    body{width:100%;max-width:100%;padding:0 5mm 8mm}
    .band{margin:0 -5mm;padding-left:5mm;padding-right:5mm;height:auto;display:block}
    .kpis,.kpi,.two,.two>div{display:block;width:100%}
    .tw>table{min-width:640px}
  }

  /* In A4: bỏ zoom, ẩn nav */
  @media print{
    html{zoom:1}
    #navdock,#toc,#tocbg,#gs,#gsbg,#tip{display:none!important}
    .tw{overflow:visible!important} .tw>table{min-width:0!important}
  }
</style>
</head>
<body>
  <!-- Band tiêu đề: logo trái + meta phải -->
  <div class="band">
    <span class="lg"></span>
    <span class="meta"><b>BÁO CÁO QUẢN TRỊ NỘI BỘ</b> · Mã BCQT-2026-08-01 · Bản v1.0<br>
      Người nhận: HĐQT &amp; Ban điều hành · Người lập: BTMH CFO<br>
      Kỳ dữ liệu … · Lập ngày … · Nội bộ - Restricted</span>
  </div>
  <div class="goldrule"></div>

  <div class="eyebrow">Bảo Tín Mạnh Hải · Khối Tài chính</div>
  <h1 class="doctitle">Tiêu đề báo cáo<br>và câu hỏi quản trị</h1>
  <p class="lead">Một đoạn tóm tắt answer-first: kết luận cốt lõi + phạm vi + deck trả lời câu hỏi gì.</p>

  <div class="kpis">
    <div class="kpi"><div class="v">632,6 <small>tỷ</small></div><div class="l">Chỉ số 1 + so sánh</div></div>
    <div class="kpi"><div class="v neg">âm 43,6 <small>tỷ</small></div><div class="l">Chỉ số 2 (âm = đỏ)</div></div>
    <div class="kpi"><div class="v">393-445 <small>tỷ</small></div><div class="l">Chỉ số 3</div></div>
    <div class="kpi"><div class="v">…</div><div class="l">Chỉ số 4</div></div>
  </div>

  <section id="s1">
    <h2><span class="n">01</span>Kết luận điều hành</h2>
    <div class="box dark"><b>Kết luận chính.</b> Câu kết luận quan trọng nhất, đọc rời vẫn hiểu.</div>
    <ol>
      <li><b>Ý 1 (takeaway).</b> Bằng chứng + số liệu.</li>
      <li><b>Ý 2.</b> …</li>
    </ol>
  </section>

  <section id="s2">
    <h2><span class="n">02</span>Tiêu đề takeaway của phần 2</h2>
    <div class="tw"><table><thead><tr><th>Cột</th><th>…</th></tr></thead><tbody><tr><td>…</td><td>…</td></tr></tbody></table></div>
    <figure class="fig"><svg viewBox="0 0 600 260" role="img"><!-- biểu đồ SVG inline --></svg>
      <figcaption>Hình 2.1. Chú thích biểu đồ.</figcaption></figure>
  </section>

  <!-- … thêm section … -->

  <!-- Điều hướng: copy nguyên #navdock + #toc + #gs + JS từ deck mẫu.
       Yêu cầu: mỗi <section> có id + <h2> để JS dựng mục lục; thuật ngữ đánh <span class="gl" data-def="…">. -->
  <div id="navdock"><!-- nút tròn: Mục lục(T) · Thuật ngữ(G) · Mục trước(K)/sau(J) · Về đầu --></div>
  <div id="toc"></div><div id="tocbg"></div>
  <aside id="gs"></aside><div id="gsbg"></div><div id="tip"></div>
  <script>/* JS nav: mở/đóng dock, cuộn theo section, dựng TOC từ section[id]>h2, tooltip .gl[data-def] */</script>
</body></html>
```

**Ghi chú khối:**
- `.band` = header maroon (logo `.lg` + `.meta` phải). Lặp lại `.band` ở chân trang làm footer nếu muốn.
- `.kpis` dùng `display:table` (in A4 ổn định hơn flex). Giá trị âm thêm class `neg` (đỏ).
- `section > h2 > span.n` = số mục (01, 02…). Tiêu đề là **câu takeaway**.
- Bảng **luôn bọc `.tw`** (cuộn ngang, không vỡ trang). Biểu đồ dùng **`.fig` + SVG inline** (không `<img>` ngoài).
- Thuật ngữ: `<span class="gl" data-def="Định nghĩa…">từ</span>` → JS hiện tooltip `#tip` + gom vào bảng thuật ngữ `#gs`.

---

## 4. Điều hướng `#navdock` (bắt buộc)

Khối nút tròn nổi góc dưới-phải. Tác giả **copy nguyên** từ deck mẫu; chỉ cần đảm bảo:
- Mỗi `<section>` có `id` + `<h2>` → JS tự dựng **Mục lục** (`#toc`).
- Đánh dấu thuật ngữ bằng `.gl[data-def]` → tự vào **Bảng thuật ngữ** (`#gs`) + tooltip.
- Phím tắt chuẩn: **T** mục lục · **G** thuật ngữ · **J/K** mục sau/trước · về đầu.

**Portal tự thêm (không cần làm):** nút **Toàn màn hình (F)** + **Hướng dẫn (?)**, tinh chỉnh **iPad** (cỡ chữ to +
nút sát mép), **cuộn mượt** TOC/thuật ngữ mọi màn hình. (Xem `src/lib/watermark.ts` → `injectDeckChrome`.)

---

## 5. Quy trình 6 bước

1. **Storyline (Pyramid).** Chốt 1 thông điệp tổng + 3–5 nhánh MECE + section 01 = kết luận. Liệt kê KPI đầu trang.
2. **Soạn nội dung** theo từng section, mỗi tiêu đề là câu takeaway; gắn bằng chứng (bảng/biểu đồ/số có nguồn).
3. **Dựng HTML** từ scaffold mục 3: điền band/meta, KPI, các section; bảng bọc `.tw`, biểu đồ `.fig` (SVG inline).
4. **Nhúng tài sản:** font (data-URI, hoặc fallback), logo (data-URI), biểu đồ (SVG). KHÔNG link ngoài.
5. **QC** theo checklist mục 7 (xem web desktop/iPad/mobile + In thử PDF A4).
6. **Publish** (mục 6) + đặt phân quyền/danh mục/mật khẩu nếu cần.

---

## 6. Xuất bản & phân quyền

**Cách A — Upload ở admin (không cần code):** `/admin` → **+ Thêm deck mới** (`/admin/new`) → nhập slug/tiêu đề →
tải file `.html` (hoặc dán HTML) → chọn Công khai/Bảo mật → Lưu. Nội dung lưu DB, phục vụ ngay; thumbnail tự chụp.

**Cách B — API (cho Claude/máy tự publish):** `POST https://deck.consultx.vn/api/publish` header
`x-publish-key: <PUBLISH_KEY>`, body `{ slug, title, html, visibility?, require_otp?, is_published?, password?,
category?, tags?, source_url?, if_match? }`. Hoặc dùng **tool MCP `deck_publish`** từ chat claude.ai.

**Bảo toàn khi CẬP NHẬT (republish cùng slug):** những trường KHÔNG truyền lại được **giữ nguyên** — mật khẩu
chung, `source_url` (link chat gốc), **phân quyền** (`visibility`/`require_otp`/`is_published`), danh mục/thẻ, và
**mọi link cá nhân đã cấp + nhóm**. Nên truyền `if_match=<content_md5 lần trước>` để chống ghi đè khi nhiều phiên
cùng sửa (lệch → 409, không ghi).

**Portal tự lo (không nhúng vào deck):** watermark định danh + log xem + chặn tải/in (deck bảo mật), phân loại
danh mục tự động (nếu bỏ trống), thumbnail preview (chụp @2x nét). Đặt **mật khẩu chung** ở trang chi tiết deck nếu
muốn phát "mã cửa".

---

## 7. Checklist QC (bắt buộc trước khi giao)

- [ ] **1 file, self-contained** — không CDN/webfont online/asset rời; mở offline vẫn đúng.
- [ ] `<title>` đặt rõ (kèm "(báo cáo A4)"); `<meta viewport>` có.
- [ ] `.band` + `.meta` đủ: tên báo cáo, mã, bản, người nhận/lập, kỳ dữ liệu, ngày, mức mật ("Nội bộ - Restricted").
- [ ] **KPI ≤ 4–5**, giá trị âm tô đỏ (`.neg`).
- [ ] Mỗi `<section>` có **`id` + `<h2>` takeaway** đánh số; section 01 = kết luận điều hành (answer-first).
- [ ] Số liệu **có nguồn/kỳ/phạm vi**; giả định ghi rõ.
- [ ] Bảng bọc **`.tw`**; biểu đồ trong **`.fig`** (SVG inline, `page-break-inside:avoid`).
- [ ] Có **`#navdock`** (+ TOC/thuật ngữ); phím T/J/K/G chạy.
- [ ] **In thử → PDF A4**: nav ẩn, bảng không cắt, không tràn lề, đường kẻ gọn.
- [ ] Xem **desktop / iPad / mobile**: chữ đọc tốt, không tràn ngang, cuộn TOC mượt.
- [ ] Thuật ngữ chuyên ngành đánh `.gl[data-def]`.
- [ ] Publish đúng chế độ (Công khai/Bảo mật) + danh mục hợp lý; nếu bảo mật → cấp link/mật khẩu cho người xem.

---

## 8. Tham chiếu
- Deck mẫu chuẩn: `btmh-bcqt-a4-bridge-loi-nhuan-t1-t7-2026` (copy `#navdock` + JS từ đây).
- Cải thiện viewer do portal chèn: `src/lib/watermark.ts` → `injectDeckChrome` (fullscreen/help/iPad/scroll).
- Phân quyền & luồng: `docs/ACCESS-CONTROL.md`. Publish/API/MCP & bảo toàn khi update: `CLAUDE.md` mục "Thêm deck mới".
- Deck slide 16:9 (khác định dạng này): `content/decks/template.html`.
