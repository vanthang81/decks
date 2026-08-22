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

// Chèn "chrome" cải thiện trải nghiệm xem cho MỌI deck dạng tài liệu (sinh từ generator, có #navdock):
//  1) iPad / máy tính bảng cảm ứng (pointer:coarse, ≥821px): nút menu nổi #navdock lùi sát mép phải hơn +
//     cỡ chữ (html zoom) to hơn cho dễ đọc. KHÔNG đụng desktop chuột (pointer:fine) và điện thoại (<821px, vốn đã ổn).
//  2) Nút chỉnh cỡ chữ nổi (A− / ⟲ / A+) ở góc dưới-trái, nhớ lựa chọn theo trình duyệt (localStorage).
// An toàn: toàn bộ JS thoát sớm nếu deck KHÔNG có #navdock (deck ảnh/deck HTML thường không bị đụng tới).
export function injectDeckChrome(html: string): string {
  const inject = `
<style id="dchrome">
  @media screen and (pointer:coarse) and (min-width:821px){
    #navdock{ right:18px !important; bottom:calc(24px + env(safe-area-inset-bottom)) !important; }
  }
  #dfont{ position:fixed; left:16px; bottom:calc(30px + env(safe-area-inset-bottom)); z-index:2147483050;
    display:flex; gap:6px; align-items:center; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  #dfont button{ width:38px; height:38px; border-radius:50%; border:1px solid rgba(0,0,0,.14);
    background:rgba(255,255,255,.94); color:#7C0312; font-weight:800; font-size:15px; line-height:1; cursor:pointer;
    box-shadow:0 2px 9px rgba(36,28,27,.20); -webkit-tap-highlight-color:transparent; }
  #dfont button.r{ font-size:16px; color:#6E6660; font-weight:600; }
  #dfont button:active{ transform:scale(.93); }
  @media (prefers-color-scheme: dark){ #dfont button{ background:rgba(28,22,21,.92); color:#E7C77A; border-color:rgba(255,255,255,.14); } #dfont button.r{ color:#B7ADA4; } }
  @media print{ #dfont{ display:none !important; } }
</style>
<script>
(function(){ try{
  if(!document.getElementById('navdock')) return; // chỉ áp cho deck tài liệu (có nav dock)
  var KEY='deckUserZoom', html=document.documentElement;
  function coarseTablet(){ try{ return window.matchMedia('(pointer:coarse) and (min-width:821px)').matches; }catch(_){ return false; } }
  function dflt(){ return coarseTablet()?1.32:1.0; }
  function applyAbs(v){ if(v){ html.style.setProperty('zoom', String(v), 'important'); } else { html.style.removeProperty('zoom'); } }
  var s=parseFloat(localStorage.getItem(KEY));
  var hasPref=(s>=0.8 && s<=2.0);
  if(hasPref){ applyAbs(s); } else if(coarseTablet()){ applyAbs(1.32); } // iPad: mặc định to hơn cho dễ đọc
  function cur(){ return hasPref?s:dflt(); }
  function set(v){ v=Math.max(0.8, Math.min(2.0, Math.round(v*100)/100)); s=v; hasPref=true; try{ localStorage.setItem(KEY,String(v)); }catch(_){}; applyAbs(v); }
  function reset(){ hasPref=false; s=NaN; try{ localStorage.removeItem(KEY); }catch(_){}; applyAbs(coarseTablet()?1.32:0); }
  function mk(t,lbl,cls){ var b=document.createElement('button'); b.type='button'; b.textContent=t; b.title=lbl; b.setAttribute('aria-label',lbl); if(cls) b.className=cls; return b; }
  var bar=document.createElement('div'); bar.id='dfont';
  var minus=mk('A\\u2212','Giảm cỡ chữ'), rst=mk('\\u27F2','Cỡ chữ mặc định','r'), plus=mk('A+','Tăng cỡ chữ');
  minus.addEventListener('click',function(){ set(cur()-0.1); });
  plus.addEventListener('click',function(){ set(cur()+0.1); });
  rst.addEventListener('click',reset);
  bar.appendChild(minus); bar.appendChild(rst); bar.appendChild(plus);
  (document.body||html).appendChild(bar);
}catch(_){} })();
</script>
`;
  if (html.includes('</body>')) return html.replace('</body>', `${inject}\n</body>`);
  return html + inject;
}
