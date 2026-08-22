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

// Chèn "chrome" cải thiện trải nghiệm xem trên iPad cho deck dạng tài liệu (sinh từ generator, có #navdock):
// iPad / máy tính bảng cảm ứng (pointer:coarse, ≥821px): nút menu nổi #navdock lùi sát mép phải hơn +
// cỡ chữ (html zoom) to hơn cho dễ đọc. KHÔNG đụng desktop chuột (pointer:fine) và điện thoại (<821px, vốn đã ổn).
// An toàn: phần bơm cỡ chữ (JS) thoát sớm nếu deck KHÔNG có #navdock (deck ảnh/deck HTML thường không bị đụng zoom).
// (Nút chỉnh cỡ chữ thủ công đã bỏ theo yêu cầu CFO 22/08 — cỡ chữ mặc định trên iPad đã đủ to.)
export function injectDeckChrome(html: string): string {
  const inject = `
<style id="dchrome">
  @media screen and (pointer:coarse) and (min-width:821px){
    #navdock{ right:18px !important; bottom:calc(24px + env(safe-area-inset-bottom)) !important; }
  }
</style>
<script>
(function(){ try{
  if(!document.getElementById('navdock')) return; // chỉ áp cho deck tài liệu (có nav dock)
  if(window.matchMedia('(pointer:coarse) and (min-width:821px)').matches){
    document.documentElement.style.setProperty('zoom', '1.32', 'important'); // iPad: cỡ chữ to hơn cho dễ đọc
  }
}catch(_){} })();
</script>
`;
  if (html.includes('</body>')) return html.replace('</body>', `${inject}\n</body>`);
  return html + inject;
}
