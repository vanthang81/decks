// ============================================================================
// GÁC WALKTHROUGH (tự động, chạy trong `npm run build` → cả QC lẫn deploy Docker).
// Bảo đảm MỌI tour trong src/lib/page-tours.ts KHOÉT SÁNG đúng phần tử THẬT trên trang:
//   (A) Mỗi bước (trừ bước MỞ ĐẦU index 0 và bước KẾT `done(...)`) PHẢI có `target`.
//   (B) Mỗi `target` PHẢI khớp một `data-tour="<target>"` có thật trong src/.
// Vi phạm → build FAIL với thông báo rõ (để không lặp lại lỗi "tour chỉ vào giữa màn").
// Thêm trang/bước mới ⇒ gắn data-tour + target là qua; không cần nhớ thủ công.
// ============================================================================
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

const toursSrc = readFileSync(join(root, 'src/lib/page-tours.ts'), 'utf8');

// --- Lấy phần thân object PAGE_TOURS = { ... } (đếm ngoặc nhọn) ---
const startM = toursSrc.match(/export const PAGE_TOURS[^=]*=\s*\{/);
if (!startM) {
  console.error('✖ check-page-tours: không tìm thấy khai báo PAGE_TOURS.');
  process.exit(1);
}
let idx = startM.index + startM[0].length;
let depth = 1;
let objBody = '';
for (; idx < toursSrc.length && depth > 0; idx++) {
  const c = toursSrc[idx];
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) break; }
  objBody += c;
}

// --- Tách từng tour: key: [ ... ] ở cấp cao nhất của object ---
// Walker theo depth để tìm '[' mở mảng của mỗi key, rồi cắt tới ']' khớp.
function tours(body) {
  const out = [];
  const re = /(['"]?)([\w-]+)\1\s*:\s*\[/g;
  let m;
  while ((m = re.exec(body))) {
    // Chỉ nhận key ở depth 0 (không lồng trong object/array khác).
    const before = body.slice(0, m.index);
    let d = 0;
    for (const ch of before) { if (ch === '{' || ch === '[') d++; else if (ch === '}' || ch === ']') d--; }
    if (d !== 0) continue;
    // Cắt mảng từ '[' khớp.
    let j = m.index + m[0].length;
    let ad = 1;
    let arr = '';
    for (; j < body.length && ad > 0; j++) {
      const ch = body[j];
      if (ch === '[') ad++;
      else if (ch === ']') { ad--; if (ad === 0) break; }
      arr += ch;
    }
    out.push({ key: m[2], body: arr });
  }
  return out;
}

// --- Tách các PHẦN TỬ cấp cao của 1 mảng tour (object {...} hoặc done(...)) ---
function elements(arrBody) {
  const els = [];
  let d = 0, cur = '', inStr = null, esc = false;
  for (let k = 0; k < arrBody.length; k++) {
    const ch = arrBody[k];
    if (inStr) {
      cur += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; cur += ch; continue; }
    if (ch === '{' || ch === '(' || ch === '[') d++;
    else if (ch === '}' || ch === ')' || ch === ']') d--;
    if (ch === ',' && d === 0) { if (cur.trim()) els.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) els.push(cur.trim());
  return els;
}

const referencedTargets = new Set();

for (const t of tours(objBody)) {
  const els = elements(t.body);
  els.forEach((el, i) => {
    const isDone = /^done\s*\(/.test(el);
    const hasTarget = /\btarget\s*:/.test(el);
    const mt = el.match(/target\s*:\s*['"]([^'"]+)['"]/);
    if (mt) referencedTargets.add(mt[1]);
    const isIntro = i === 0;
    // Bước mô tả 1 khu vực (không phải intro, không phải done) PHẢI có target.
    if (!isDone && !isIntro && !hasTarget) {
      const ttl = (el.match(/title\s*:\s*['"]([^'"]+)['"]/) || [])[1] || `#${i}`;
      errors.push(`Tour "${t.key}" bước "${ttl}" THIẾU target → sẽ hiện thẻ giữa màn thay vì khoét sáng phần tử. Thêm target trỏ tới data-tour thật.`);
    }
  });
}

// --- Thu thập data-tour trong src/: cả anchor TĨNH ("x") lẫn TIỀN TỐ ĐỘNG ({`nav-${g.key}`}) ---
const anchors = new Set();
const dynamicPrefixes = []; // vd 'nav-' từ data-tour={`nav-${g.key}`}
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) {
      const txt = readFileSync(p, 'utf8');
      let m;
      const reStatic = /data-tour=["']([^"']+)["']/g;
      while ((m = reStatic.exec(txt))) anchors.add(m[1]);
      // data-tour={`<prefix>${...}`} → chấp nhận mọi target bắt đầu bằng <prefix>
      const reDyn = /data-tour=\{`([^`$]*)\$\{/g;
      while ((m = reDyn.exec(txt))) if (m[1]) dynamicPrefixes.push(m[1]);
    }
  }
}
walk(join(root, 'src'));

const anchored = (t) => anchors.has(t) || dynamicPrefixes.some((pre) => t.startsWith(pre));
for (const tgt of referencedTargets) {
  if (!anchored(tgt)) {
    errors.push(`target "${tgt}" trong page-tours.ts KHÔNG có phần tử data-tour="${tgt}" nào trong src/ → tour sẽ không khoét sáng được. Gắn data-tour vào đúng khối trên trang.`);
  }
}

if (errors.length) {
  console.error('\n✖ Walkthrough chưa đạt — sửa trước khi build:\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n(Quy tắc: mỗi bước tour mô tả 1 khu vực phải có `target` trỏ `data-tour` thật; chỉ bước mở đầu & bước kết được không target.)\n');
  process.exit(1);
}
console.log(`✓ check-page-tours: ${referencedTargets.size} target đều khoét sáng đúng phần tử data-tour.`);
