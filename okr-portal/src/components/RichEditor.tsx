'use client';

import { useEffect, useRef } from 'react';

// Editor WYSIWYG tối giản (contentEditable + execCommand) — KHÔNG phụ thuộc thư viện.
// Xuất HTML qua 1 <input hidden name={name}> để form (EditModal) gửi kèm; server LÀM SẠCH lại
// (sanitizeRichHtml) trước khi lưu, nên an toàn.
//
// ⚠ Vùng soạn là contentEditable KHÔNG-KIỂM-SOÁT: nạp nội dung 1 lần lúc mount qua ref, React
// KHÔNG đụng vào nội dung khi re-render (tránh mất chữ đang gõ — fix 25/08).
//
// ⭐ taskMode (biên bản họp, kiểu Lark): gõ "[]" → CHECKBOX (bấm để tick), "@" → chọn người,
// nút 📅 hoặc gõ ngày → chip HẠN. Lưu về DẠNG VĂN BẢN ([ ]/[x], @Tên, dd/mm/yyyy, #Tn) để
// server parse (minutes-tasks.ts) + hiển thị lại (hydrate). Các widget chỉ tồn tại lúc soạn.

type Cmd = { icon: React.ReactNode; title: string; run: () => void };
type Person = { email: string; name: string };

// ───────────────────────── Helper (task widgets) ─────────────────────────
const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const MARKER_RE = /^(\s*)(\[\s*([xX ]?)\s*\])\s?/;
const DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const KEY_RE = /#T(\d+)\b/;
const isoToLabel = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
function dmyToIso(d: string, m: string, y?: string): string {
  let yy = y ? +y : new Date().getFullYear(); if (yy < 100) yy += 2000;
  return `${yy}-${String(+m).padStart(2, '0')}-${String(+d).padStart(2, '0')}`;
}
function cbEl(done: boolean): HTMLElement {
  const s = document.createElement('span');
  s.className = 'mt-cb'; s.setAttribute('contenteditable', 'false'); s.dataset.done = done ? '1' : '0';
  s.setAttribute('title', 'Bấm để đánh dấu hoàn thành'); return s;
}
function atEl(name: string, email?: string): HTMLElement {
  const s = document.createElement('span');
  s.className = 'mt-at'; s.setAttribute('contenteditable', 'false');
  if (email) s.dataset.email = email; s.textContent = '@' + name; return s;
}
function dueEl(iso: string, label: string): HTMLElement {
  const s = document.createElement('span');
  s.className = 'mt-due'; s.setAttribute('contenteditable', 'false'); s.dataset.due = iso;
  s.textContent = '📅 ' + label; return s;
}
function keyEl(key: string): HTMLElement {
  const s = document.createElement('span');
  s.className = 'mt-key'; s.setAttribute('contenteditable', 'false'); s.textContent = ' #' + key; return s;
}

/** Text ([ ]/[x], @Tên, ngày, #Tn) → widget để hiển thị/soạn. */
function hydrateTasks(html: string, people: Person[]): string {
  const box = document.createElement('div');
  box.innerHTML = html || '';
  const starts: { node: Text; block: Element | null }[] = [];
  box.querySelectorAll('p,div,li,h3,h4,blockquote').forEach((el) => {
    let n: Node = el; while (n && n.firstChild && n.nodeType !== 3) n = n.firstChild;
    if (n && n.nodeType === 3) starts.push({ node: n as Text, block: el });
  });
  const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  let tn: Node | null;
  while ((tn = w.nextNode())) {
    const prev = (tn as Text).previousSibling;
    if (prev && prev.nodeName === 'BR') starts.push({ node: tn as Text, block: null });
  }
  if (box.firstChild && box.firstChild.nodeType === 3) starts.push({ node: box.firstChild as Text, block: null });
  const seen = new Set<Text>();
  for (const s of starts) {
    if (seen.has(s.node)) continue; seen.add(s.node);
    const m = MARKER_RE.exec(s.node.nodeValue || ''); if (!m) continue;
    const done = (m[3] || '').toLowerCase() === 'x';
    const rest = (s.node.nodeValue || '').slice(m[0].length);
    const parent = s.node.parentNode; if (!parent) continue;
    parent.insertBefore(cbEl(done), s.node);
    parent.insertBefore(document.createTextNode(' ' + rest), s.node);
    parent.removeChild(s.node);
    if (done && s.block) s.block.classList.add('mt-done');
  }
  transformTextNodes(box, people);
  return box.innerHTML;
}

function transformTextNodes(root: Element, people: Person[]) {
  const sorted = [...people].filter((p) => p.name).sort((a, b) => b.name.length - a.name.length);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('.mt-at,.mt-due,.mt-key,.mt-cb'))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = []; let tn: Node | null;
  while ((tn = w.nextNode())) nodes.push(tn as Text);
  for (const node of nodes) {
    const text = node.nodeValue || '';
    const repls: { start: number; end: number; el: () => HTMLElement }[] = [];
    const taken: [number, number][] = [];
    const lower = norm(text);
    for (const p of sorted) {
      const needle = '@' + norm(p.name); let from = 0;
      for (;;) {
        const at = lower.indexOf(needle, from); if (at < 0) break;
        const end = at + needle.length; const after = text[end] || ' ';
        if (!taken.some(([s, e]) => at < e && end > s) && !/[\p{L}\p{N}]/u.test(after)) {
          repls.push({ start: at, end, el: () => atEl(p.name, p.email) }); taken.push([at, end]);
        }
        from = end;
      }
    }
    let dm: RegExpExecArray | null; const dr = new RegExp(DATE_RE.source, 'g');
    while ((dm = dr.exec(text))) {
      const s = dm.index, e = s + dm[0].length;
      if (taken.some(([a, b]) => s < b && e > a)) continue;
      const iso = dmyToIso(dm[1], dm[2], dm[3]);
      repls.push({ start: s, end: e, el: () => dueEl(iso, isoToLabel(iso)) }); taken.push([s, e]);
    }
    let km: RegExpExecArray | null; const kr = new RegExp(KEY_RE.source, 'g');
    while ((km = kr.exec(text))) {
      const s = km.index, e = s + km[0].length;
      if (taken.some(([a, b]) => s < b && e > a)) continue;
      const key = 'T' + km[1];
      repls.push({ start: s, end: e, el: () => keyEl(key) }); taken.push([s, e]);
    }
    if (!repls.length) continue;
    repls.sort((a, b) => a.start - b.start);
    const frag = document.createDocumentFragment(); let pos = 0;
    for (const r of repls) {
      if (r.start > pos) frag.appendChild(document.createTextNode(text.slice(pos, r.start)));
      frag.appendChild(r.el()); pos = r.end;
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode?.replaceChild(frag, node);
  }
}

/** Widget → text để lưu/gửi server. */
function serializeTasks(ed: HTMLElement): string {
  const clone = ed.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.mt-cb').forEach((el) =>
    el.replaceWith(document.createTextNode((el as HTMLElement).dataset.done === '1' ? '[x]' : '[ ]')));
  clone.querySelectorAll('.mt-at').forEach((el) => el.replaceWith(document.createTextNode(el.textContent || '')));
  clone.querySelectorAll('.mt-due').forEach((el) => {
    const iso = (el as HTMLElement).dataset.due;
    el.replaceWith(document.createTextNode(iso ? isoToLabel(iso) : (el.textContent || '').replace(/^📅\s*/, '')));
  });
  clone.querySelectorAll('.mt-key').forEach((el) => el.replaceWith(document.createTextNode(el.textContent || '')));
  clone.querySelectorAll('.mt-done').forEach((el) => el.classList.remove('mt-done'));
  return clone.innerHTML;
}

export default function RichEditor({
  name, defaultValue = '', placeholder = 'Nhập nội dung…', minHeight = 140, onChange,
  taskMode = false, people = [],
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: number;
  onChange?: (html: string) => void;
  taskMode?: boolean;              // bật tính năng công việc "[]" kiểu Lark
  people?: Person[];               // danh sách người để chọn khi gõ "@"
}) {
  const edRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inited = useRef(false);
  const emitRef = useRef<() => void>(() => {});
  const openDateRef = useRef<() => void>(() => {});

  const sync = () => {
    if (inputRef.current && edRef.current) {
      const raw = taskMode ? serializeTasks(edRef.current) : edRef.current.innerHTML;
      const val = raw === '<br>' ? '' : raw;
      inputRef.current.value = val;
      onChange?.(val);
    }
  };
  emitRef.current = sync;

  // Nạp nội dung 1 lần + (taskMode) gắn tương tác live.
  useEffect(() => {
    const ed = edRef.current;
    if (!ed || inited.current) return;
    ed.innerHTML = taskMode ? hydrateTasks(defaultValue || '', people) : (defaultValue || '');
    inited.current = true;
    if (!taskMode) return;
    const emit = () => emitRef.current();
    const winSel = () => window.getSelection();
    const caret = () => { const s = winSel(); return s && s.rangeCount ? s.getRangeAt(0) : null; };

    let menu: HTMLDivElement | null = null;
    let menuItems: Person[] = [];
    let menuActive = 0;
    let menuOnPick: (p: Person) => void = () => {};
    const closeMenu = () => { if (menu) { menu.remove(); menu = null; menuItems = []; } };
    const updateActive = () => { if (menu) [...menu.children].forEach((c, i) => (c as HTMLElement).classList.toggle('active', i === menuActive)); };
    // Mở menu chọn người (dùng cho cả gõ "@" lẫn nút 👤 trên dòng việc).
    const openMenu = (rect: DOMRect, matches: Person[], onPick: (p: Person) => void) => {
      closeMenu();
      menu = document.createElement('div'); menu.className = 'mt-menu'; menuItems = matches; menuActive = 0; menuOnPick = onPick;
      matches.forEach((p, i) => {
        const it = document.createElement('div'); it.className = 'mt-item' + (i === 0 ? ' active' : '');
        it.textContent = p.name;
        it.addEventListener('mousedown', (e) => { e.preventDefault(); closeMenu(); onPick(p); });
        menu!.appendChild(it);
      });
      document.body.appendChild(menu);
      const ref = (rect.width || rect.height) ? rect : ed.getBoundingClientRect();
      menu.style.left = ref.left + 'px'; menu.style.top = (ref.bottom + 4) + 'px';
    };
    // Đặt con trỏ cuối 1 block (dòng) → trả range để chèn chip.
    const putCaretEnd = (block: Element) => {
      const r = document.createRange(); r.selectNodeContents(block); r.collapse(false);
      const s = winSel(); s?.removeAllRanges(); s?.addRange(r);
      return caret();
    };
    const insertChipAt = (rng: Range | null, chip: HTMLElement) => {
      if (!rng) return;
      const space = document.createTextNode(' ');
      rng.insertNode(space); rng.insertNode(chip);
      const nr = document.createRange(); nr.setStartAfter(space); nr.collapse(true);
      const s = winSel(); s?.removeAllRanges(); s?.addRange(nr);
      emit();
    };
    // Gõ "@..." → menu; chọn → thay "@query" bằng chip.
    const checkMention = () => {
      const r = caret(); if (!r || !r.collapsed) { closeMenu(); return; }
      const node = r.startContainer; if (node.nodeType !== 3) { closeMenu(); return; }
      const before = (node.nodeValue || '').slice(0, r.startOffset);
      const m = /@([^@]*)$/.exec(before); if (!m || m[1].length > 30) { closeMenu(); return; }
      const nq = norm(m[1]);
      const matches = people.filter((p) => norm(p.name).includes(nq)).slice(0, 8);
      if (!matches.length) { closeMenu(); return; }
      const rect = r.getBoundingClientRect();
      openMenu((rect.width || rect.height) ? rect : ed.getBoundingClientRect(), matches, (p) => {
        const rr = caret(); if (!rr) return;
        const nd = rr.startContainer;
        if (nd.nodeType === 3) {
          const bf = (nd.nodeValue || '').slice(0, rr.startOffset);
          const atIdx = bf.lastIndexOf('@');
          if (atIdx >= 0) {
            const rng = document.createRange(); rng.setStart(nd, atIdx); rng.setEnd(nd, rr.startOffset); rng.deleteContents();
            insertChipAt(rng, atEl(p.name, p.email));
          }
        }
      });
    };
    const checkCheckbox = () => {
      const r = caret(); if (!r || !r.collapsed) return;
      const node = r.startContainer; if (node.nodeType !== 3) return;
      const before = (node.nodeValue || '').slice(0, r.startOffset);
      if (!/^(\s*)\[\s?\]\s?$/.test(before)) return;
      const rng = document.createRange(); rng.setStart(node, 0); rng.setEnd(node, r.startOffset); rng.deleteContents();
      const cb = cbEl(false); const space = document.createTextNode(' ');
      rng.insertNode(space); rng.insertNode(cb);
      const nr = document.createRange(); nr.setStartAfter(space); nr.collapse(true);
      const s = winSel(); s?.removeAllRanges(); s?.addRange(nr);
    };
    const checkDate = () => {
      const r = caret(); if (!r || !r.collapsed) return;
      const node = r.startContainer; if (node.nodeType !== 3) return;
      const before = (node.nodeValue || '').slice(0, r.startOffset);
      const m = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s$/.exec(before); if (!m) return;
      const dm = DATE_RE.exec(m[1]); if (!dm) return;
      const iso = dmyToIso(dm[1], dm[2], dm[3]);
      const startOff = r.startOffset - m[0].length;
      const rng = document.createRange(); rng.setStart(node, startOff); rng.setEnd(node, r.startOffset); rng.deleteContents();
      const chip = dueEl(iso, isoToLabel(iso)); const space = document.createTextNode(' ');
      rng.insertNode(space); rng.insertNode(chip);
      const nr = document.createRange(); nr.setStartAfter(space); nr.collapse(true);
      const s = winSel(); s?.removeAllRanges(); s?.addRange(nr);
    };
    const onInput = () => { checkCheckbox(); checkDate(); checkMention(); emit(); };
    const onKeydown = (e: KeyboardEvent) => {
      if (!menu) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); menuActive = (menuActive + 1) % menuItems.length; updateActive(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); menuActive = (menuActive - 1 + menuItems.length) % menuItems.length; updateActive(); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const p = menuItems[menuActive]; closeMenu(); if (p) menuOnPick(p); }
      else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    };

    // Con trỏ ĐÃ LƯU khi bấm nút trên thanh (giữ vị trí chèn vì bấm nút không làm mất selection).
    let savedCaret: Range | null = null;
    // Chọn ngày → chèn chip HẠN tại range cho trước (con trỏ / con trỏ đã lưu).
    const pickDate = (at: Range | null) => {
      const inp = document.createElement('input'); inp.type = 'date';
      inp.style.position = 'fixed'; inp.style.left = '-9999px'; document.body.appendChild(inp);
      inp.addEventListener('change', () => {
        const iso = inp.value; inp.remove(); if (!iso) return;
        ed.focus();
        const rr = at || caret();
        if (rr) { const s = winSel(); s?.removeAllRanges(); s?.addRange(rr); }
        insertChipAt(rr, dueEl(iso, isoToLabel(iso)));
      });
      if (typeof inp.showPicker === 'function') inp.showPicker(); else inp.click();
    };
    openDateRef.current = () => pickDate(caret());

    // ── Thanh icon nổi trên DÒNG VIỆC đang soạn (kiểu Lark): 👤 giao người · 📅 đặt hạn ──
    const bar = document.createElement('div');
    bar.className = 'mt-linebar'; bar.style.display = 'none';
    const btnAssign = document.createElement('button');
    btnAssign.type = 'button'; btnAssign.className = 'mt-lb-btn'; btnAssign.title = 'Giao người phụ trách'; btnAssign.textContent = '👤';
    const btnDate = document.createElement('button');
    btnDate.type = 'button'; btnDate.className = 'mt-lb-btn'; btnDate.title = 'Đặt hạn'; btnDate.textContent = '📅';
    bar.appendChild(btnAssign); bar.appendChild(btnDate);
    ed.parentElement?.appendChild(bar);
    btnAssign.addEventListener('mousedown', (e) => {
      e.preventDefault();
      savedCaret = caret(); if (!savedCaret) return;
      openMenu(btnAssign.getBoundingClientRect(), people.slice(0, 8), (p) => {
        if (savedCaret) { const s = winSel(); s?.removeAllRanges(); s?.addRange(savedCaret); }
        insertChipAt(savedCaret || caret(), atEl(p.name, p.email));
      });
    });
    btnDate.addEventListener('mousedown', (e) => { e.preventDefault(); savedCaret = caret(); pickDate(savedCaret); });

    // Checkbox của DÒNG chứa con trỏ (bao cả trường hợp nội dung chưa bọc trong block).
    const lineCheckbox = (range: Range): HTMLElement | null => {
      const node = range.startContainer;
      const el: Element | null = node.nodeType === 3 ? node.parentElement : (node as Element);
      const block = el?.closest('p,div,li,h3,h4,blockquote') ?? null;
      const cont: Element = (block && block !== ed) ? block : ed;
      const kids = Array.from(cont.childNodes);
      let idx = kids.findIndex((k) => k === node || k.contains(node));
      if (idx < 0) idx = Math.min(range.startOffset, Math.max(0, kids.length - 1));
      let s = idx; while (s > 0 && kids[s - 1].nodeName !== 'BR') s--;
      let e = idx; while (e < kids.length - 1 && kids[e + 1].nodeName !== 'BR') e++;
      for (let i = s; i <= e; i++) {
        const k = kids[i];
        if (k.nodeType === 1) {
          const el2 = k as Element;
          if (el2.classList?.contains('mt-cb')) return el2 as HTMLElement;
          const q = el2.querySelector?.('.mt-cb'); if (q) return q as HTMLElement;
        }
      }
      return null;
    };
    const updateBar = () => {
      try {
        const r = caret();
        const cb = r ? lineCheckbox(r) : null;
        if (!cb) { bar.style.display = 'none'; return; }
        const wrap = ed.parentElement as HTMLElement; if (!wrap) return;
        const wr = wrap.getBoundingClientRect(); const cr = cb.getBoundingClientRect();
        bar.style.display = 'flex';
        bar.style.top = Math.max(2, cr.top - wr.top - 2) + 'px';
        bar.style.right = '6px';
      } catch { bar.style.display = 'none'; }
    };

    const onInputAll = () => { onInput(); updateBar(); };
    const onKeyup = () => updateBar();
    const onMouseup = () => updateBar();
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const cb = t.closest && t.closest('.mt-cb') as HTMLElement | null;
      if (cb) {
        const done = cb.dataset.done === '1' ? '0' : '1';
        cb.dataset.done = done;
        const block = cb.closest('p,div,li,h3,h4,blockquote');
        if (block) block.classList.toggle('mt-done', done === '1');
        emit();
      }
      updateBar();
    };

    ed.addEventListener('input', onInputAll);
    ed.addEventListener('keydown', onKeydown);
    ed.addEventListener('keyup', onKeyup);
    ed.addEventListener('mouseup', onMouseup);
    ed.addEventListener('click', onClick);
    ed.addEventListener('blur', () => setTimeout(() => { if (!menu) bar.style.display = 'none'; }, 200));
    return () => {
      ed.removeEventListener('input', onInputAll);
      ed.removeEventListener('keydown', onKeydown);
      ed.removeEventListener('keyup', onKeyup);
      ed.removeEventListener('mouseup', onMouseup);
      ed.removeEventListener('click', onClick);
      bar.remove();
      closeMenu();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command: string, value?: string) => {
    edRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  };
  const addLink = () => {
    const url = window.prompt('Nhập đường dẫn (https://…):', 'https://');
    if (url && /^(https?:|mailto:)/i.test(url.trim())) exec('createLink', url.trim());
  };
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) document.execCommand('insertText', false, text);
    sync();
  };

  const cmds: Cmd[] = [
    { icon: <b>B</b>, title: 'Đậm (Ctrl+B)', run: () => exec('bold') },
    { icon: <i>I</i>, title: 'Nghiêng (Ctrl+I)', run: () => exec('italic') },
    { icon: <u>U</u>, title: 'Gạch chân (Ctrl+U)', run: () => exec('underline') },
    { icon: <span style={{ textDecoration: 'line-through' }}>S</span>, title: 'Gạch ngang', run: () => exec('strikeThrough') },
    { icon: <b style={{ fontSize: 13 }}>H</b>, title: 'Tiêu đề', run: () => exec('formatBlock', 'H3') },
    { icon: '¶', title: 'Đoạn văn', run: () => exec('formatBlock', 'P') },
    { icon: '• ', title: 'Danh sách chấm', run: () => exec('insertUnorderedList') },
    { icon: '1.', title: 'Danh sách số', run: () => exec('insertOrderedList') },
    { icon: '❝', title: 'Trích dẫn', run: () => exec('formatBlock', 'BLOCKQUOTE') },
    { icon: '🔗', title: 'Chèn liên kết', run: addLink },
    { icon: '⨯', title: 'Xoá định dạng', run: () => exec('removeFormat') },
  ];

  return (
    <div className="rte">
      <div className="rte-tb" role="toolbar" aria-label="Định dạng">
        {taskMode && (
          <button type="button" className="rte-btn rte-task-btn" title="Chèn công việc [] (checkbox)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { exec('insertText', '[] '); }}>☐</button>
        )}
        {cmds.map((c, i) => (
          <button key={i} type="button" className="rte-btn" title={c.title}
            onMouseDown={(e) => e.preventDefault()} onClick={c.run}>
            {c.icon}
          </button>
        ))}
        {taskMode && (
          <button type="button" className="rte-btn" title="Đặt hạn (chọn ngày)"
            onMouseDown={(e) => e.preventDefault()} onClick={() => openDateRef.current()}>📅</button>
        )}
      </div>
      <div
        ref={edRef}
        className="rte-ed i"
        contentEditable
        suppressContentEditableWarning
        data-ph={placeholder}
        style={{ minHeight }}
        onInput={sync}
        onBlur={sync}
        onPaste={onPaste}
      />
      <input ref={inputRef} type="hidden" name={name} defaultValue={defaultValue === '<br>' ? '' : defaultValue} />
    </div>
  );
}
