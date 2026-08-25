// ─────────────────────────────────────────────────────────────────────────────
// Công việc dạng "[]" trong BIÊN BẢN HỌP (kiểu Lark) — parse + đồng bộ với "Hành động".
//
// Cú pháp trên MỘT DÒNG biên bản:
//   []  hoặc  [ ]  hoặc  - [ ]   → tạo công việc (checkbox chưa xong)
//   [x] hoặc  [X]  hoặc  - [x]   → công việc đã xong
//   @Tên Người        → người phụ trách (nhiều @ → người ĐẦU phụ trách, còn lại "cùng tham gia")
//   25/08  25/08/2026 → hạn (dd/mm hoặc dd/mm/yyyy)
//   #T3               → THẺ LIÊN KẾT (tự chèn khi tạo) để sửa dòng ↔ cập nhật đúng việc
//
// 2 chiều: sửa dòng "[]" (tên/người/hạn/tick xong) → cập nhật việc bên dưới; việc đánh Xong
// bên dưới → hiện [x] trong biên bản (áp ở lúc hiển thị qua applyTaskDoneToMinutes).
//
// KHÔNG viết đè câu chữ biên bản: chỉ chèn thẻ "#Tn" cuối dòng việc + đổi dấu tick.
// ─────────────────────────────────────────────────────────────────────────────

import { query } from './db';
import { sanitizeRichHtml } from './sanitizeHtml';
import type { OkrUser } from './users';

export type ParsedMinuteTask = {
  key: string | null;        // 'T3' nếu dòng đã có thẻ #T3, null nếu chưa (việc mới)
  done: boolean;             // dấu tick [x]
  title: string;             // tiêu đề (đã bỏ marker/@/ngày/#thẻ)
  ownerNames: string[];      // tên người theo thứ tự xuất hiện (đã khớp user)
  ownerEmails: string[];     // email tương ứng (khớp theo display_name)
  dueOn: string | null;      // ISO yyyy-mm-dd
  segIndex: number;          // vị trí segment trong mảng (để ghi lại HTML)
};

const BLOCK_SPLIT = /(<br\s*\/?>|<\/(?:p|div|li|h3|h4|blockquote)>)/i;

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/ /g, ' ');
}

// Marker checkbox ở ĐẦU dòng (cho phép "- " / "* " dẫn trước).
const MARKER_RE = /^\s*(?:[-*]\s*)?(?:\[\s*([xX ]?)\s*\]|(☐|▢|◻|◻️)|(☑|☑️|✅|✔️|✔))\s*/;

/** Có phải dòng công việc "[]" không + đã tick chưa. */
function matchMarker(text: string): { isTask: boolean; done: boolean; rest: string } {
  const m = MARKER_RE.exec(text);
  if (!m) return { isTask: false, done: false, rest: text };
  const checked = (m[1] && m[1].toLowerCase() === 'x') || !!m[3];
  return { isTask: true, done: !!checked, rest: text.slice(m[0].length) };
}

const DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
function parseDue(text: string, todayYear: number): { iso: string | null; raw: string | null } {
  const m = DATE_RE.exec(text);
  if (!m) return { iso: null, raw: null };
  const d = +m[1], mo = +m[2];
  let y = m[3] ? +m[3] : todayYear;
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return { iso: null, raw: null };
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { iso, raw: m[0] };
}

/**
 * Khớp @mention với danh sách user theo display_name (ưu tiên tên DÀI khớp trước để không
 * cắt cụt tên nhiều chữ). Trả về theo thứ tự xuất hiện trong dòng.
 */
function matchOwners(text: string, users: { email: string; name: string }[]): { names: string[]; emails: string[] } {
  const found: { idx: number; name: string; email: string }[] = [];
  const lower = text.toLowerCase();
  const sorted = [...users].filter((u) => u.name).sort((a, b) => b.name.length - a.name.length);
  const taken: Array<[number, number]> = []; // vùng ký tự đã dùng (tránh khớp lồng)
  for (const u of sorted) {
    const needle = '@' + u.name.toLowerCase();
    let from = 0;
    for (;;) {
      const at = lower.indexOf(needle, from);
      if (at < 0) break;
      const end = at + needle.length;
      // Ranh giới: ký tự sau phải là hết chuỗi / khoảng trắng / dấu câu (không phải chữ) — tránh khớp tên ngắn nằm trong tên dài.
      const after = text[end] ?? ' ';
      const overlaps = taken.some(([s, e]) => at < e && end > s);
      if (!overlaps && !/[\p{L}\p{N}]/u.test(after)) {
        found.push({ idx: at, name: u.name, email: u.email });
        taken.push([at, end]);
      }
      from = end;
    }
  }
  found.sort((a, b) => a.idx - b.idx);
  return { names: found.map((f) => f.name), emails: found.map((f) => f.email) };
}

const KEY_RE = /#T(\d+)\b/;

/** Parse toàn bộ biên bản → danh sách segment + các dòng công việc. */
export function parseMinutesTasks(
  html: string,
  users: { email: string; name: string }[],
  todayYear: number,
): { segments: string[]; tasks: ParsedMinuteTask[] } {
  const segments = (html || '').split(BLOCK_SPLIT);
  const tasks: ParsedMinuteTask[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    // Bỏ qua các segment DELIMITER (khớp BLOCK_SPLIT) — chúng ở vị trí lẻ nhưng cứ kiểm cho chắc.
    if (/^(<br\s*\/?>|<\/(?:p|div|li|h3|h4|blockquote)>)$/i.test(seg)) continue;
    const text = stripTags(seg).trim();
    if (!text) continue;
    const mk = matchMarker(text);
    if (!mk.isTask) continue;
    let rest = mk.rest;
    const keyM = KEY_RE.exec(rest);
    const key = keyM ? `T${keyM[1]}` : null;
    if (keyM) rest = rest.replace(KEY_RE, ' ');
    const due = parseDue(rest, todayYear);
    if (due.raw) rest = rest.replace(due.raw, ' ');
    const owners = matchOwners(rest, users);
    // Bỏ các @mention khỏi tiêu đề (kể cả tên nhiều chữ đã khớp).
    for (const nm of owners.names) {
      rest = rest.replace(new RegExp('@' + nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
    }
    // Bỏ @mention còn sót (không khớp user) cho gọn tiêu đề.
    rest = rest.replace(/@[^\s@#]+/g, ' ');
    const title = rest.replace(/\s+/g, ' ').trim();
    tasks.push({
      key, done: mk.done, title,
      ownerNames: owners.names, ownerEmails: owners.emails,
      dueOn: due.iso, segIndex: i,
    });
  }
  return { segments, tasks };
}

/** Đổi dấu tick trong segment: done → [x], chưa → [ ]. Bỏ qua các thẻ HTML dẫn đầu (<p>/<li>…). */
function setChecked(seg: string, done: boolean): string {
  return seg.replace(
    /^(\s*(?:<[^>]+>\s*)*(?:[-*]\s*)?)(\[\s*[xX ]?\s*\]|☐|▢|◻|◻️|☑|☑️|✅|✔️|✔)/,
    (_full, pre) => `${pre}[${done ? 'x' : ' '}]`,
  );
}

export type MinuteSyncResult = { html: string; created: number; updated: number };

// KHOÁ LIÊN KẾT dòng "[]" ↔ việc = TIÊU ĐỀ đã chuẩn hoá (bỏ dấu, thường hoá, gộp khoảng trắng),
// lưu ở okr_initiatives.minutes_key. Nhờ khoá theo tiêu đề, đồng bộ LẶP LẠI (mỗi lần tự lưu) là
// idempotent — không tạo trùng — nên có thể chạy NGAY khi tự lưu nháp (việc hiện xuống Hành động
// mà không cần "Lưu & đóng"). KHÔNG chèn ký tự lạ (#Tn) vào biên bản → sạch như Lark.
export function minuteTaskKey(title: string): string {
  return (title || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 180);
}

/**
 * Đồng bộ dòng "[]" trong biên bản → công việc (okr_initiatives, gắn meeting_id).
 * Khớp theo TIÊU ĐỀ (minutes_key): có → CẬP NHẬT (người/hạn/tick xong); chưa → TẠO mới.
 * KHÔNG xoá việc khi xoá dòng (tránh mất việc ngoài ý muốn). Không đổi HTML biên bản.
 */
export async function syncMeetingMinutesTasks(opts: {
  meetingId: string;
  minutesHtml: string;
  users: OkrUser[];
  actor: string;
  todayYear: number;
}): Promise<MinuteSyncResult> {
  const { meetingId, minutesHtml, actor, todayYear } = opts;
  const userOpts = opts.users.map((u) => ({ email: u.email, name: u.display_name || u.email }));
  const { tasks } = parseMinutesTasks(minutesHtml, userOpts, todayYear);
  const real = tasks.filter((t) => t.title);
  if (real.length === 0) return { html: minutesHtml, created: 0, updated: 0 };

  const existing = await query<{ id: string; minutes_key: string; status: string }>(
    `SELECT id, minutes_key, status FROM okr_initiatives WHERE meeting_id=$1 AND minutes_key IS NOT NULL`,
    [meetingId],
  );
  const byKey = new Map(existing.map((e) => [e.minutes_key, e]));
  const handled = new Set<string>();

  let created = 0, updated = 0;
  for (const t of real) {
    const key = minuteTaskKey(t.title);
    if (handled.has(key)) continue; // 2 dòng trùng tiêu đề trong 1 lần → chỉ xử 1
    handled.add(key);
    const owner = t.ownerEmails[0] ?? null;
    const others = t.ownerNames.slice(1);
    const desc = others.length ? `Cùng tham gia: ${others.join(', ')}` : null;
    const ex = byKey.get(key);
    if (ex) {
      let status = ex.status;
      if (t.done && ex.status !== 'done') status = 'done';
      else if (!t.done && ex.status === 'done') status = 'todo';
      await query(
        `UPDATE okr_initiatives SET title=$2, owner_email=$3, due_on=$4,
            description=COALESCE($5, description), status=$6,
            progress=CASE WHEN $6='done' THEN 100 WHEN status='done' AND $6<>'done' THEN 0 ELSE progress END,
            done_on=CASE WHEN $6='done' THEN COALESCE(done_on, now()::date) ELSE NULL END,
            updated_at=now()
          WHERE id=$1`,
        [ex.id, t.title, owner, t.dueOn, desc, status],
      );
      updated++;
    } else {
      const status = t.done ? 'done' : 'todo';
      await query(
        `INSERT INTO okr_initiatives
           (objective_id, key_result_id, parent_id, kind, title, description, owner_email, unit_id,
            project_id, meeting_id, status, priority, start_on, due_on, budget_planned, budget_actual,
            budget_source, created_by, code, minutes_key, done_on, progress)
         VALUES (NULL, NULL, NULL, 'action', $1, $2, $3, NULL, NULL, $4, $5, 'medium', NULL, $6, 0, 0,
                 NULL, $7, NULL, $8,
                 CASE WHEN $5='done' THEN now()::date ELSE NULL END,
                 CASE WHEN $5='done' THEN 100 ELSE 0 END)
         ON CONFLICT (meeting_id, minutes_key) WHERE minutes_key IS NOT NULL DO NOTHING`,
        [t.title, desc, owner, meetingId, status, t.dueOn, actor, key],
      );
      created++;
    }
  }
  return { html: minutesHtml, created, updated };
}

/**
 * Áp trạng thái XONG của việc (bên dưới) NGƯỢC vào biên bản để hiển thị: dòng có #Tn mà việc
 * đã 'done' → hiện [x]; ngược lại [ ]. Dùng ở lúc render (view + nạp editor) — 2 chiều dấu tick.
 */
/** Lấy trạng thái xong/chưa của các việc gắn thẻ minutes_key trong cuộc họp (để phản ánh dấu tick). */
export async function meetingMinutesTaskStates(
  meetingId: string,
): Promise<{ done: Set<string>; open: Set<string> }> {
  const rows = await query<{ minutes_key: string; status: string }>(
    `SELECT minutes_key, status FROM okr_initiatives WHERE meeting_id=$1 AND minutes_key IS NOT NULL`,
    [meetingId],
  );
  const done = new Set<string>();
  const open = new Set<string>();
  for (const r of rows) (r.status === 'done' ? done : open).add(r.minutes_key);
  return { done, open };
}

export function applyTaskDoneToMinutes(
  html: string,
  doneKeys: Set<string>,
  openKeys: Set<string>,
  people: { email: string; name: string }[] = [],
  todayYear = 2026,
): string {
  if (!html || (doneKeys.size === 0 && openKeys.size === 0)) return html;
  const { segments, tasks } = parseMinutesTasks(html, people, todayYear);
  for (const t of tasks) {
    if (!t.title) continue;
    const key = minuteTaskKey(t.title);
    if (doneKeys.has(key)) segments[t.segIndex] = setChecked(segments[t.segIndex], true);
    else if (openKeys.has(key)) segments[t.segIndex] = setChecked(segments[t.segIndex], false);
  }
  return segments.join('');
}

// ── HIỂN THỊ (read-only) đẹp: dòng "[]" → ô tick + chip người + chip hạn (giống ô soạn) ──
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isoLabel = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
export function renderMinutesTasksView(
  html: string,
  people: { email: string; name: string }[] = [],
  todayYear = 2026,
): string {
  const sanitized = sanitizeRichHtml(html || '');
  if (!sanitized) return '';
  const { segments, tasks } = parseMinutesTasks(sanitized, people, todayYear);
  const bySeg = new Map(tasks.filter((t) => t.title).map((t) => [t.segIndex, t]));
  for (let i = 0; i < segments.length; i++) {
    const t = bySeg.get(i);
    if (!t) continue;
    let seg = segments[i];
    // marker → ô tick (đã/chưa xong)
    seg = seg.replace(
      /^(\s*(?:<[^>]+>\s*)*)(?:[-*]\s*)?(\[\s*[xX ]?\s*\]|☐|▢|◻|◻️|☑|☑️|✅|✔️|✔)\s?/,
      (_m, pre) => `${pre}<span class="mv-cb${t.done ? ' on' : ''}"></span> `,
    );
    // @tên đã khớp → chip
    for (const nm of t.ownerNames) {
      seg = seg.replace(new RegExp('@' + escRe(nm)), `<span class="mv-at">@${nm}</span>`);
    }
    // ngày → chip hạn
    if (t.dueOn) seg = seg.replace(DATE_RE, `<span class="mv-due">📅 ${isoLabel(t.dueOn)}</span>`);
    // bỏ thẻ #Tn cũ (nếu dữ liệu cũ còn) cho sạch
    seg = seg.replace(KEY_RE, '');
    if (t.done) {
      // Bọc mv-done TRONG thẻ block (không bọc cả <p> → tránh span chứa block sai chuẩn).
      const mOpen = seg.match(/^(\s*<(?:p|div|li|h3|h4|blockquote)\b[^>]*>)/i);
      seg = mOpen
        ? `${mOpen[1]}<span class="mv-done">${seg.slice(mOpen[1].length)}</span>`
        : `<span class="mv-done">${seg}</span>`;
    }
    segments[i] = seg;
  }
  return segments.join('');
}
