// Dựng deck HTML self-contained từ danh sách ẢNH slide (JPEG base64) — để host PDF/PPTX mà vẫn dùng
// nguyên hạ tầng deck hiện có (watermark, mật khẩu, cấp/thu link, log, chống tải, in PDF).
// Xem 1 slide/lần, điều hướng ←→/Space/click, đếm trang, fullscreen; in ra mỗi slide 1 trang.
export function buildImageDeckHtml(pagesB64: string[], title: string): string {
  const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));
  const slides = pagesB64
    .map((b, i) => `<figure class="slide"${i === 0 ? '' : ' hidden'}><img src="data:image/jpeg;base64,${b}" alt="Slide ${i + 1}" draggable="false"></figure>`)
    .join('');
  const total = pagesB64.length;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${esc(title)}</title>
<style>
  :root{color-scheme:dark}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;background:#0B0E13;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .stage{position:fixed;inset:0;display:grid;place-items:center;user-select:none;-webkit-user-select:none}
  .slide{width:100%;height:100%;display:grid;place-items:center;padding:16px}
  .slide[hidden]{display:none}
  .slide img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 24px 80px -30px rgba(0,0,0,.8);border-radius:6px;pointer-events:none}
  .nav{position:fixed;top:0;bottom:0;width:22%;cursor:pointer;z-index:5;background:transparent;border:0}
  .nav.prev{left:0}.nav.next{right:0}
  .bar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:14px;
    padding:9px;z-index:6;background:linear-gradient(0deg,rgba(0,0,0,.55),transparent);opacity:0;transition:opacity .2s}
  body:hover .bar,.bar:focus-within{opacity:1}
  .bar button{background:#1b2431;color:#EAF0F6;border:1px solid #2b3648;border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
  .bar button:hover{border-color:#3595D5;color:#7FC0EE}
  .count{position:fixed;right:14px;bottom:12px;z-index:6;color:#9EAAB8;font-size:12.5px;font-variant-numeric:tabular-nums}
  @media print{
    html,body{overflow:visible;background:#fff}
    .stage{position:static;display:block}
    .nav,.bar,.count{display:none!important}
    .slide{display:block!important;width:100%;height:auto;padding:0;page-break-after:always}
    .slide img{max-height:none;box-shadow:none;border-radius:0}
  }
</style></head>
<body>
  <div class="stage" id="stage">${slides}</div>
  <button class="nav prev" id="prev" aria-label="Slide trước"></button>
  <button class="nav next" id="next" aria-label="Slide sau"></button>
  <div class="bar">
    <button id="bprev">‹ Trước</button>
    <button id="bfull">Toàn màn hình</button>
    <button id="bnext">Sau ›</button>
  </div>
  <div class="count"><span id="cur">1</span> / ${total}</div>
<script>
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide')),n=slides.length,i=0,cur=document.getElementById('cur');
  function show(k){i=Math.max(0,Math.min(n-1,k));slides.forEach(function(s,x){s.hidden=x!==i});cur.textContent=i+1;}
  function next(){show(i+1)} function prev(){show(i-1)}
  document.getElementById('next').onclick=next;document.getElementById('prev').onclick=prev;
  document.getElementById('bnext').onclick=next;document.getElementById('bprev').onclick=prev;
  // Toàn màn hình đa trình duyệt (Safari/macOS cần webkit; Firefox moz; IE/Edge cũ ms).
  function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement;}
  function toggleFull(){
    var el=document.documentElement;
    if(fsEl()){
      var ex=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||document.msExitFullscreen;
      if(ex){try{ex.call(document);}catch(_){}}
    } else {
      var rq=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen;
      if(rq){try{var p=rq.call(el);if(p&&p.catch)p.catch(function(){});}catch(_){}}
    }
  }
  document.getElementById('bfull').onclick=toggleFull;
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();next();}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();prev();}
    else if(e.key==='Home'){show(0);} else if(e.key==='End'){show(n-1);}
    else if(e.key.toLowerCase&&e.key.toLowerCase()==='f'){toggleFull();}
  });
  show(0);
})();
</script>
</body></html>`;
}
