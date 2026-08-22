// Chèn watermark định danh + lớp chống tải/in + beacon log vào HTML deck (server-side).
// Nội dung deck do CFO/Claude kiểm soát trong repo → an toàn khi render.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapProtectedDeck(
  html: string,
  opts: { email: string; name: string | null; deckSlug: string },
): string {
  const who = escapeHtml(opts.name ? `${opts.name} · ${opts.email}` : opts.email);
  const stamp = escapeHtml(new Date().toISOString());

  const inject = `
<style>
  @media print { html, body { display: none !important; } }
  #dw-mark { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
    background-repeat: repeat; opacity: .10;
    background-image: repeating-linear-gradient(-30deg, transparent 0 220px,
      rgba(0,0,0,0) 220px 221px); }
  #dw-mark .r { position: absolute; white-space: nowrap; font: 600 13px/1.2 system-ui, sans-serif;
    color: #808080; transform: rotate(-30deg); }
  #dw-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483001;
    font: 500 11px/1 system-ui, sans-serif; color: #9a9a9a; background: rgba(255,255,255,.35);
    padding: 4px 10px; text-align: center; pointer-events: none; }
  @media (prefers-color-scheme: dark) { #dw-bar { background: rgba(0,0,0,.35); } }
</style>
<div id="dw-mark" aria-hidden="true"></div>
<div id="dw-bar">Tài liệu bảo mật — cấp riêng cho <b>${who}</b> · ${stamp} · deck.consultx.vn</div>
<script>
(function(){
  var who=${JSON.stringify(who)};
  // rải watermark
  var wrap=document.getElementById('dw-mark');
  if(wrap){ for(var y=-100;y<window.innerHeight+400;y+=180){ for(var x=-100;x<window.innerWidth+600;x+=520){
    var r=document.createElement('div'); r.className='r'; r.textContent=who; r.style.left=x+'px'; r.style.top=y+'px'; wrap.appendChild(r);
  }}}
  // giảm tải/in
  document.addEventListener('contextmenu',function(e){e.preventDefault();});
  document.addEventListener('selectstart',function(e){e.preventDefault();});
  document.addEventListener('copy',function(e){e.preventDefault();});
  document.addEventListener('keydown',function(e){
    var k=(e.key||'').toLowerCase();
    if((e.ctrlKey||e.metaKey)&&(k==='p'||k==='s'||k==='u')){e.preventDefault();}
  });
  // beacon: server tự lấy grant từ cookie phiên
  function beacon(ev,extra){ try{ navigator.sendBeacon('/api/beacon',
    new Blob([JSON.stringify(Object.assign({event:ev},extra||{}))],{type:'application/json'})); }catch(_){} }
  beacon('view',{});
  var t0=Date.now();
  document.addEventListener('visibilitychange',function(){ if(document.hidden){ beacon('slide',{elapsed:Math.round((Date.now()-t0)/1000)}); }});
  window.addEventListener('pagehide',function(){ beacon('slide',{elapsed:Math.round((Date.now()-t0)/1000)}); });
})();
</script>
`;

  if (html.includes('</body>')) return html.replace('</body>', `${inject}\n</body>`);
  return html + inject;
}

// Chèn "chrome" cải thiện trải nghiệm xem cho deck dạng tài liệu (sinh từ generator, có #navdock).
// TẤT CẢ gated theo #navdock → deck ảnh/deck HTML thường KHÔNG bị đụng. Sửa 1 chỗ ⇒ áp cho mọi deck.
//  1) iPad/máy tính bảng cảm ứng (pointer:coarse, ≥821px): #navdock lùi sát mép phải + cỡ chữ (html zoom) to hơn.
//  2) Bổ sung nút TOÀN MÀN HÌNH (#nb-fs) + nút HƯỚNG DẪN điều hướng (#nb-help) vào #navsub (kế thừa style deck).
//  3) TOC (#toc) + bảng thuật ngữ (#gs): cuộn mượt, không tràn nền, thanh cuộn rõ, bù chiều cao do zoom
//     (drawer position:fixed bị html{zoom} phóng to → tràn đáy màn hình trên iPad) ⇒ cuộn hết nội dung mọi màn hình.
export function injectDeckChrome(html: string): string {
  const inject = `
<style id="dchrome">
  @media screen and (pointer:coarse) and (min-width:821px){
    #navdock{ right:18px !important; bottom:calc(24px + env(safe-area-inset-bottom)) !important; }
  }
  /* Nút mới trong dock dùng font hệ thống để hiện đúng ký hiệu ⛶ / ? */
  #nb-fs, #nb-help{ font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important; font-size:15px !important; }
  /* Cuộn TOC + thuật ngữ: mượt, không tràn nền, thanh cuộn rõ — mọi màn hình */
  #toc, #gs{ overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
    scrollbar-width: thin; scrollbar-color: rgba(124,3,18,.45) transparent;
    padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important; }
  #toc::-webkit-scrollbar, #gs::-webkit-scrollbar{ width:10px; }
  #toc::-webkit-scrollbar-thumb, #gs::-webkit-scrollbar-thumb{ background:rgba(124,3,18,.40); border-radius:8px; border:2px solid transparent; background-clip:padding-box; }
  #toc::-webkit-scrollbar-thumb:hover, #gs::-webkit-scrollbar-thumb:hover{ background:rgba(124,3,18,.62); background-clip:padding-box; }
  /* iPad cảm ứng: html{zoom:1.32} phóng cả phần tử fixed → bù chiều cao để drawer vừa đúng 1 màn hình, cuộn hết. */
  @media screen and (pointer:coarse) and (min-width:821px){
    #toc, #gs{ height: calc(100vh / 1.32) !important; height: calc(100dvh / 1.32) !important; }
  }
  /* Hộp hướng dẫn điều hướng */
  #dhelp{ position:fixed; inset:0; z-index:2147483200; display:none; align-items:center; justify-content:center;
    background:rgba(36,28,27,.5); padding:20px; -webkit-backdrop-filter:blur(2px); backdrop-filter:blur(2px); }
  #dhelp.on{ display:flex; }
  #dhelp-card{ background:#FAF7F2; color:#241C1B; width:min(94vw,420px); border-radius:12px; padding:22px 22px 18px;
    border-top:4px solid #7C0312; box-shadow:0 30px 70px -30px rgba(36,28,27,.6);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; max-height:88vh; overflow-y:auto; }
  #dhelp-h{ font-weight:800; font-size:16px; color:#7C0312; margin-bottom:12px; }
  #dhelp dl{ margin:0; display:grid; grid-template-columns:auto 1fr; gap:9px 14px; align-items:center; }
  #dhelp dt{ font-weight:800; color:#7C0312; background:#F1EADE; border:1px solid #D8C9B4; border-radius:6px;
    padding:2px 9px; text-align:center; min-width:34px; font-size:13px; justify-self:start; white-space:nowrap; }
  #dhelp dd{ margin:0; font-size:13.5px; }
  #dhelp-tip{ margin:14px 0 4px; font-size:12px; color:#6E6660; }
  #dhelp-x{ margin-top:12px; width:100%; padding:10px; border:0; border-radius:8px; background:#7C0312; color:#fff;
    font-weight:700; font-size:14px; cursor:pointer; }
  #dhelp-x:hover{ background:#5A0210; }
  @media (prefers-color-scheme: dark){
    #dhelp-card{ background:#241C1B; color:#F1EADE; } #dhelp dd{ color:#E7DED4; }
    #dhelp dt{ background:#3E020C; color:#E7C77A; border-color:#5A0210; } #dhelp-tip{ color:#B7ADA4; }
  }
</style>
<script>
(function(){ try{
  var dock = document.getElementById('navdock');
  if(!dock) return; // chỉ áp cho deck tài liệu (có nav dock)
  var html = document.documentElement;

  // (1) iPad: cỡ chữ to hơn (đặt inline zoom, ghi đè breakpoint tablet 1.20 của deck).
  try{ if(window.matchMedia('(pointer:coarse) and (min-width:821px)').matches){
    html.style.setProperty('zoom', '1.32', 'important');
  } }catch(_){}

  var sub = document.getElementById('navsub');
  function mkbtn(id, txt, label){ var b=document.createElement('button'); b.id=id; b.type='button';
    b.textContent=txt; b.setAttribute('aria-label',label); b.title=label; return b; }

  // (2) TOÀN MÀN HÌNH
  function fsEl(){ return document.fullscreenElement || document.webkitFullscreenElement; }
  function enterFs(){ var e=document.documentElement; var fn=e.requestFullscreen||e.webkitRequestFullscreen; if(fn){ try{ fn.call(e); }catch(_){} } }
  function exitFs(){ var fn=document.exitFullscreen||document.webkitExitFullscreen; if(fn){ try{ fn.call(document); }catch(_){} } }
  function toggleFs(){ if(fsEl()) exitFs(); else enterFs(); }
  var fs = mkbtn('nb-fs', '\\u26F6', 'Toàn màn hình (F)');
  fs.addEventListener('click', function(e){ e.stopPropagation(); toggleFs(); });
  function syncFs(){ var on=!!fsEl(); fs.textContent = on ? '\\u2922' : '\\u26F6'; var t = on ? 'Thoát toàn màn hình (F)' : 'Toàn màn hình (F)'; fs.title=t; fs.setAttribute('aria-label',t); }
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);

  // (1b) HƯỚNG DẪN điều hướng
  var help = mkbtn('nb-help', '?', 'Hướng dẫn điều hướng');
  var overlay = null;
  function buildOverlay(){
    if(overlay) return overlay;
    overlay = document.createElement('div'); overlay.id='dhelp';
    overlay.innerHTML = '<div id="dhelp-card" role="dialog" aria-modal="true" aria-label="Hướng dẫn điều hướng">'
      + '<div id="dhelp-h">Điều hướng tài liệu</div>'
      + '<dl>'
      + '<dt>\\u2261</dt><dd>Mở / đóng bảng điều hướng (nút tròn)</dd>'
      + '<dt>T</dt><dd>Mở mục lục</dd>'
      + '<dt>J / K</dt><dd>Tới mục sau / mục trước</dd>'
      + '<dt>G</dt><dd>Bảng thuật ngữ</dd>'
      + '<dt>\\u2191</dt><dd>Về đầu tài liệu</dd>'
      + '<dt>F</dt><dd>Bật / tắt toàn màn hình</dd>'
      + '<dt>Esc</dt><dd>Đóng bảng đang mở</dd>'
      + '</dl>'
      + '<div id="dhelp-tip">Trên máy tính bảng / điện thoại: chạm các nút tương ứng trong menu tròn ở góc phải.</div>'
      + '<button type="button" id="dhelp-x">Đã hiểu</button>'
      + '</div>';
    overlay.addEventListener('click', function(e){ if(e.target===overlay || e.target.id==='dhelp-x') closeHelp(); });
    (document.body||html).appendChild(overlay);
    return overlay;
  }
  function openHelp(){ buildOverlay(); overlay.classList.add('on'); }
  function closeHelp(){ if(overlay) overlay.classList.remove('on'); }
  help.addEventListener('click', function(e){ e.stopPropagation(); if(overlay && overlay.classList.contains('on')) closeHelp(); else openHelp(); });

  // Chèn 2 nút vào #navsub (kế thừa style #navsub button của deck).
  if(sub){ sub.appendChild(fs); sub.appendChild(help); }

  // Phím tắt: F = toàn màn hình; Esc = đóng hướng dẫn. Bỏ qua khi đang gõ ô nhập.
  document.addEventListener('keydown', function(e){
    var t=e.target, tag=t && t.tagName;
    if(tag==='INPUT' || tag==='TEXTAREA' || (t && t.isContentEditable)) return;
    var k = e.key || '';
    if((k==='f' || k==='F') && !e.metaKey && !e.ctrlKey && !e.altKey){ e.preventDefault(); toggleFs(); }
    else if(k==='Escape'){ closeHelp(); }
  });
}catch(_){} })();
</script>
`;
  if (html.includes('</body>')) return html.replace('</body>', `${inject}\n</body>`);
  return html + inject;
}
