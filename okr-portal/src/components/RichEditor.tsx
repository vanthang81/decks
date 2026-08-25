'use client';

import { useEffect, useRef } from 'react';

// Editor WYSIWYG tối giản (contentEditable + execCommand) — KHÔNG phụ thuộc thư viện.
// Xuất HTML qua 1 <input hidden name={name}> để form (EditModal) gửi kèm; server LÀM SẠCH lại
// (sanitizeRichHtml) trước khi lưu, nên an toàn. Định dạng: đậm/nghiêng/gạch chân/tiêu đề/
// danh sách/trích dẫn/liên kết. Placeholder qua CSS (.rte-ed:empty::before).
//
// ⚠ QUAN TRỌNG (fix mất chữ 25/08): vùng soạn là contentEditable KHÔNG-KIỂM-SOÁT.
// TRƯỚC ĐÂY dùng dangerouslySetInnerHTML={defaultValue} → mỗi khi component cha re-render
// (MinutesEditor setState "đang lưu…" mỗi lần gõ, HOẶC trang refresh sau khi tự lưu nháp làm
// defaultValue đổi) React GHI ĐÈ innerHTML → XOÁ SẠCH chữ đang gõ / vừa dán. Nay khởi tạo nội
// dung MỘT LẦN qua ref lúc mount, React KHÔNG bao giờ đụng vào nội dung nữa → gõ/dán không mất.

type Cmd = { icon: React.ReactNode; title: string; run: () => void; wide?: boolean };

export default function RichEditor({
  name,
  defaultValue = '',
  placeholder = 'Nhập nội dung…',
  minHeight = 140,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: number;
  onChange?: (html: string) => void;   // gọi mỗi lần nội dung đổi (để tự lưu nháp)
}) {
  const edRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inited = useRef(false);

  // Nạp nội dung ban đầu ĐÚNG MỘT LẦN (mount). Sau đó KHÔNG đồng bộ lại từ defaultValue nữa
  // để tránh React/parent re-render ghi đè chữ người dùng đang gõ. Popup đóng→mở lại =
  // component remount → nạp lại nội dung mới nhất (đúng vòng đời EditModal).
  useEffect(() => {
    if (edRef.current && !inited.current) {
      edRef.current.innerHTML = defaultValue || '';
      inited.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    if (inputRef.current && edRef.current) {
      // Nếu chỉ còn <br> rỗng thì coi như trống.
      const html = edRef.current.innerHTML;
      const val = html === '<br>' ? '' : html;
      inputRef.current.value = val;
      onChange?.(val);
    }
  };
  const exec = (command: string, value?: string) => {
    edRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  };
  const addLink = () => {
    const url = window.prompt('Nhập đường dẫn (https://…):', 'https://');
    if (url && /^(https?:|mailto:)/i.test(url.trim())) exec('createLink', url.trim());
  };
  // Dán = chèn VĂN BẢN THUẦN (giữ xuống dòng) — tránh dán kèm rác HTML/style từ Word/web
  // (server cũng sẽ lột hết thẻ lạ khi lưu, nên dán text cho khớp kết quả + không vỡ layout).
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
        {cmds.map((c, i) => (
          <button key={i} type="button" className="rte-btn" title={c.title}
            onMouseDown={(e) => e.preventDefault() /* giữ selection */} onClick={c.run}>
            {c.icon}
          </button>
        ))}
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
