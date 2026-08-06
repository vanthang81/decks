# -*- coding: utf-8 -*-
import os
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(D, "deck.html")
CHROME = "/opt/pw-browsers/chromium"

JS = r"""
(k) => {
  const s = document.querySelectorAll('.slide')[k];
  const sr = s.getBoundingClientRect();
  const isCover = s.classList.contains('cover') || s.classList.contains('divider');
  const hasSrc = !!s.querySelector('.src');
  const PAD = {l:60, r:1280-60, t:44, b: isCover ? 720 : (hasSrc ? 672 : 700)};
  const out = [];
  const skip = el => el.closest('.src') || el.closest('.pg');
  s.querySelectorAll('*').forEach(el => {
    if (skip(el)) return;
    if (el.tagName.toLowerCase()==='defs' || el.closest('defs')) return;
    const r = el.getBoundingClientRect();
    if (r.width===0 || r.height===0) return;
    const L=r.left-sr.left, R=r.right-sr.left, T=r.top-sr.top, B=r.bottom-sr.top;
    const cn = typeof el.className==='string' ? el.className : (el.className.baseVal||'');
    const id = el.tagName.toLowerCase() + (cn ? '.'+cn.trim().split(/\s+/).join('.') : '');
    if (L < PAD.l-2) out.push({type:'ngoài-trái', el:id, v:Math.round(L)});
    if (R > PAD.r+2) out.push({type:'ngoài-phải', el:id, v:Math.round(R)});
    if (T < PAD.t-2) out.push({type:'ngoài-trên', el:id, v:Math.round(T)});
    if (B > PAD.b+2) out.push({type:'ngoài-đáy',  el:id, v:Math.round(B)});
  });
  const CONT = '.box, .card, .hl, .chartwrap, .kpi, td, th';
  s.querySelectorAll(CONT).forEach(c => {
    if (skip(c)) return;
    const cr = c.getBoundingClientRect(); if (cr.width===0) return;
    c.querySelectorAll('*').forEach(el => {
      if (el.closest('defs')) return;
      const r = el.getBoundingClientRect();
      if (r.width===0 || r.height===0) return;
      const cn = typeof el.className==='string' ? el.className : (el.className.baseVal||'');
      const id = el.tagName.toLowerCase() + (cn ? '.'+cn.trim().split(/\s+/).join('.') : '');
      const cid = c.tagName.toLowerCase();
      if (r.left  < cr.left  -2) out.push({type:'tràn-hộp(trái)', el:id, inside:cid, v:Math.round(cr.left-r.left)});
      if (r.right > cr.right +2) out.push({type:'tràn-hộp(phải)', el:id, inside:cid, v:Math.round(r.right-cr.right)});
      if (r.top   < cr.top   -2) out.push({type:'tràn-hộp(trên)', el:id, inside:cid, v:Math.round(cr.top-r.top)});
      if (r.bottom> cr.bottom+2) out.push({type:'tràn-hộp(đáy)',  el:id, inside:cid, v:Math.round(r.bottom-cr.bottom)});
    });
  });
  s.querySelectorAll('.box,.card,.hl,.chartwrap,td,th,p,li').forEach(el => {
    if (skip(el)) return;
    const ow = el.scrollWidth - el.clientWidth, oh = el.scrollHeight - el.clientHeight;
    const cn = typeof el.className==='string' ? el.className : '';
    const id = el.tagName.toLowerCase() + (cn ? '.'+cn.trim().split(/\s+/).join('.') : '');
    if (ow > 2) out.push({type:'bị-cắt-ngang', el:id, v:ow});
    if (oh > 2) out.push({type:'bị-cắt-dọc',  el:id, v:oh});
  });
  s.querySelectorAll('svg').forEach(sv => {
    const vr = sv.getBoundingClientRect();
    sv.querySelectorAll('text,rect,circle,path,polyline,line,tspan').forEach(el => {
      if (el.closest('defs')) return;
      let r; try { r = el.getBoundingClientRect(); } catch(e){ return; }
      if (r.width===0 && r.height===0) return;
      const t = el.tagName.toLowerCase();
      const txt = t==='text' ? ' "'+(el.textContent||'').slice(0,30)+'"' : '';
      if (r.left   < vr.left   -1) out.push({type:'SVG-tràn-trái', el:t+txt, v:Math.round(vr.left-r.left)});
      if (r.right  > vr.right  +1) out.push({type:'SVG-tràn-phải', el:t+txt, v:Math.round(r.right-vr.right)});
      if (r.top    < vr.top    -1) out.push({type:'SVG-tràn-trên', el:t+txt, v:Math.round(vr.top-r.top)});
      if (r.bottom > vr.bottom +1) out.push({type:'SVG-tràn-đáy',  el:t+txt, v:Math.round(r.bottom-vr.bottom)});
    });
  });
  // .body scroll check (không đo trực tiếp .body kích thước)
  const b = s.querySelector('.body');
  if (b && (b.scrollHeight-b.clientHeight>2)) out.push({type:'body-cắt-dọc', el:'.body', v:b.scrollHeight-b.clientHeight});
  const seen={}, uniq=[];
  out.forEach(o => { const kk=o.type+'|'+o.el+'|'+(o.inside||''); if(!seen[kk]){seen[kk]=1;uniq.push(o);} });
  return { t: s.dataset.t || '', issues: uniq };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME)
    pg = b.new_page(viewport={"width":1280,"height":720})
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2600)
    n = pg.evaluate("document.querySelectorAll('.slide').length")
    gl = pg.evaluate("document.querySelectorAll('.gl').length")
    bad=0; total=0
    for k in range(n):
        pg.evaluate("(k)=>{document.querySelectorAll('.slide').forEach(s=>s.classList.remove('active'));document.querySelectorAll('.slide')[k].classList.add('active');}", k)
        pg.wait_for_timeout(700)
        r = pg.evaluate(JS, k)
        if r["issues"]:
            bad+=1; total+=len(r["issues"])
            print(f"\n slide {k+1} - {r['t'][:48]}")
            for it in r["issues"][:16]:
                extra=f" trong {it['inside']}" if it.get("inside") else ""
                print(f"   X {it['type']:<20} {it['el'][:52]}{extra} ({it['v']}px)")
    print(f"\n=== {bad}/{n} slide co loi ({total} loi) ; .gl={gl} ; JS err={errs or 'khong'} ===")
    b.close()
