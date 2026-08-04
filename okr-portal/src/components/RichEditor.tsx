'use client';

import { useRef } from 'react';

// Editor WYSIWYG tối giản (contentEditable + execCommand) — KHÔNG phụ thuộc thư viện.
// Xuất HTML qua 1 <input hidden name={name}> để form (EditModal) gửi kèm; server LÀM SẠCH lại
// (sanitizeRichHtml) trước khi lưu, nên an toàn. Định dạng: đậm/nghiêng/gạch chân/tiêu đề/
// danh sách/trích dẫn/liên kết. Placeholder qua CSS (.rte-ed:empty::before).

type Cmd = { icon: React.ReactNode; title: string; run: () => void; wide?: boolean };

export default function RichEditor({
  name,
  defaultValue = '',
  placeholder = 'Nhập nội dung…',
  minHeight = 140,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: number;
}) {
  const edRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sync = () => {
    if (inputRef.current && edRef.current) {
      // Nếu chỉ còn <br> rỗng thì coi như trống.
      const html = edRef.current.innerHTML;
      inputRef.current.value = html === '<br>' ? '' : html;
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
        dangerouslySetInnerHTML={{ __html: defaultValue }}
      />
      <input ref={inputRef} type="hidden" name={name} defaultValue={defaultValue === '<br>' ? '' : defaultValue} />
    </div>
  );
}
