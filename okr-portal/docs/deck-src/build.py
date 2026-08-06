# -*- coding: utf-8 -*-
# Builder deck HTML tuân thủ SOP BTMH — Slide Deck HTML v1.0.
import os
D = os.path.dirname(os.path.abspath(__file__))
def b64(f): return open(os.path.join(D, f)).read().strip()
LG = b64('logo_lockup_white.b64')   # lockup trắng (cover/closing trên nền maroon)
MM = b64('mono_maroon.b64')         # monogram maroon (footer slide sáng)
MI = b64('mono_ivory.b64')          # monogram ivory (footer slide tối)

HEAD = '''<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hệ thống Quản trị Hiệu suất BTMH — Giới thiệu</title>
<style>
:root{
 --maroon:#7C0312;--maroon-dk:#54000C;--maroon-lt:#9E2233;--gold:#B08D2E;--gold-lt:#D9BE72;
 --gold-pale:#EFE3C4;--cream:#F5F2EC;--cream2:#FAF8F4;--ink:#1C1C1C;--grey:#6B6B6B;--line:#E2DCD3;--white:#fff;
 --ok:#2E6B4F;--warn:#B4741A;--bad:#A32218;
 --lg:url("data:image/png;base64,%LG%");--mm:url("data:image/png;base64,%MM%");--mi:url("data:image/png;base64,%MI%");
}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:#fff;transition:background .18s ease;color:var(--ink);
 font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:transparent}
#deck{width:1280px;height:720px;position:relative;transform-origin:center center;flex:none;flex-shrink:0}
.slide{position:absolute;inset:0;width:1280px;height:720px;background:#fff;padding:44px 60px 52px;
 display:none;flex-direction:column;overflow:hidden}
.slide.active{display:flex}
.eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:0 0 7px}
h1.tk{font-size:29px;line-height:1.24;font-weight:700;color:var(--maroon);margin:0}
h1.tk em{font-style:normal;color:var(--gold)}
.sub{font-size:15px;color:var(--grey);margin:6px 0 0}
.rule{height:3px;width:100%;margin:13px 0 15px;background:linear-gradient(90deg,var(--maroon),var(--gold))}
.body{flex:1;display:flex;flex-direction:column;gap:14px;min-height:0;overflow:hidden}
p{font-size:14.5px;line-height:1.5;margin:0}
.src{position:absolute;left:60px;right:60px;bottom:22px;font-size:10.5px;color:#9A9A9A;line-height:1.35}
.pg.bm{position:absolute;right:26px;bottom:13px;display:flex;align-items:center;gap:7px;font-size:11px;color:#C4C4C4;font-variant-numeric:tabular-nums}
.pg.bm i{width:21px;height:19px;background:var(--mm) center/contain no-repeat;display:block;opacity:.9;flex:none}
.pg.bm .wm{font-size:8.5px;letter-spacing:.13em;color:var(--maroon);font-weight:700;opacity:.7;white-space:nowrap}
.pg.bm .num{color:var(--maroon);font-weight:700;margin-left:3px}
.slide.divider .pg.bm i{background-image:var(--mi)}
.slide.divider .pg.bm{color:rgba(240,226,203,.55)}
.slide.divider .pg.bm .wm{color:var(--gold-lt);opacity:.85}
.slide.divider .pg.bm .num{color:var(--gold-lt)}
/* cols */
.cols{display:flex;gap:22px;align-items:stretch;flex-wrap:wrap}
.c50{flex:0 1 calc(50% - 11px);min-width:0}.c33{flex:0 1 calc(33.333% - 15px);min-width:0}
.c66{flex:0 1 calc(66.666% - 11px);min-width:0}.c40{flex:0 1 calc(40% - 14px);min-width:0}.c60{flex:0 1 calc(60% - 8px);min-width:0}
.stack{display:flex;flex-direction:column;gap:12px;min-height:0}
/* components */
.card{background:var(--cream);border-left:4px solid var(--gold);padding:13px 16px;border-radius:0 5px 5px 0}
.card.m{border-left-color:var(--maroon)}
.card h4,.box h4{font-size:13px;color:var(--maroon);margin:0 0 5px;font-weight:700}
.card p,.box p{font-size:13px;color:#333;line-height:1.5}
.box{border:1px solid var(--line);border-radius:6px;padding:13px 15px;background:#fff}
.hl{background:var(--maroon);color:#fff;padding:14px 18px;border-radius:6px}
.hl h4{color:var(--gold-lt);font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 5px}
.hl p{color:#F3E7E9;font-size:13.5px;line-height:1.5}
ul.tick{margin:0;padding:0;list-style:none}
ul.tick li{position:relative;padding-left:19px;font-size:13px;line-height:1.5;margin-bottom:7px}
ul.tick li:before{content:"";position:absolute;left:0;top:7px;width:7px;height:7px;background:var(--gold);border-radius:1px;transform:rotate(45deg)}
ol.num{margin:0;padding:0;list-style:none;counter-reset:n}
ol.num li{counter-increment:n;position:relative;padding-left:27px;font-size:13px;line-height:1.5;margin-bottom:9px}
ol.num li:before{content:counter(n);position:absolute;left:0;top:1px;width:19px;height:19px;background:var(--maroon);color:#fff;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.kpis{display:flex;gap:14px}
.kpi{flex:1 1 0;background:var(--cream2);border:1px solid var(--line);border-top:3px solid var(--maroon);border-radius:5px;padding:12px 13px;text-align:center}
.kpi .n{font-size:26px;font-weight:800;color:var(--maroon);line-height:1.1}
.kpi .n small{font-size:14px;font-weight:700}
.kpi .l{font-size:11.5px;color:var(--grey);margin-top:5px;line-height:1.35}
.kpi .d{font-size:10.5px;color:var(--gold);margin-top:3px;font-weight:700}
.kpi.g{border-top-color:var(--gold)}.kpi.g .n{color:var(--gold)}
table.t{width:100%;border-collapse:collapse;font-size:12.2px}
table.t th{background:var(--maroon);color:#fff;text-align:left;padding:7px 9px;font-weight:600;font-size:11.5px}
table.t td{padding:6px 9px;border-bottom:1px solid var(--line);line-height:1.4;vertical-align:top}
table.t tr:nth-child(even) td{background:var(--cream2)}
table.t td.n{text-align:right;font-variant-numeric:tabular-nums}
table.t .em{font-weight:700;color:var(--maroon)}
.tag{display:inline-block;font-size:10.5px;font-weight:700;padding:2.5px 8px;border-radius:11px}
.tag.hi{background:#FBE5E2;color:var(--bad)}.tag.md{background:#FBF0DC;color:var(--warn)}.tag.lo{background:#E4F0EA;color:var(--ok)}
.chartwrap{background:var(--cream2);border:1px solid var(--line);border-radius:6px;padding:12px 14px}
.chartwrap .ct{font-size:12px;font-weight:700;color:var(--maroon);margin-bottom:6px}
.lg{display:flex;gap:14px;flex-wrap:wrap;margin-top:7px}
.lg span{font-size:11px;color:var(--grey);display:inline-flex;align-items:center;gap:5px}
.lg i{width:11px;height:11px;border-radius:2px;display:inline-block}
.flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}
.flow .nd{flex:1 1 0;min-width:120px;border:1px solid var(--line);border-radius:7px;padding:12px 10px;text-align:center;background:var(--cream2)}
.flow .nd b{color:var(--maroon);font-size:14px;display:block}.flow .nd span{color:var(--grey);font-size:11px}
.flow .ar{color:var(--gold);font-size:20px;font-weight:700;flex:none}
/* cover */
.slide.cover{background:linear-gradient(135deg,#5E0210 0%,#7C0312 45%,#96122A 100%);color:#fff;justify-content:center;padding:60px 72px;overflow:hidden}
.slide.cover:after{content:"";position:absolute;right:-140px;top:-140px;width:620px;height:620px;border:60px solid rgba(217,190,114,.11);border-radius:50%}
.clogo{display:block;width:210px;height:132px;background:var(--lg) left center/contain no-repeat;filter:none}
.slide.cover h1{font-size:52px;line-height:1.12;font-weight:800;margin:26px 0 0;max-width:20ch}
.slide.cover .csub{font-size:20px;color:var(--gold-lt);margin:16px 0 0;max-width:52ch;line-height:1.45}
.slide.cover .cline{height:2px;width:120px;background:var(--gold);margin:26px 0 20px}
.cmeta{display:flex;gap:44px;flex-wrap:wrap}
.cmeta div{font-size:12px;color:rgba(240,226,203,.75)}
.cmeta b{display:block;color:#fff;font-size:14px;font-weight:700;margin-top:2px}
.slide.cover .src{color:rgba(240,226,203,.5)}
/* divider */
.slide.divider{background:var(--maroon-dk);color:#fff;justify-content:center;padding:60px 72px}
.slide.divider .pnum{font-size:100px;font-weight:800;color:rgba(217,190,114,.22);line-height:1}
.slide.divider h2{font-size:44px;font-weight:800;color:#fff;margin:2px 0 0}
.slide.divider .dlead{font-size:16px;color:var(--gold-lt);margin:16px 0 0;max-width:60ch;line-height:1.5}
.dots{display:flex;gap:8px;margin-top:26px}
.dots i{width:9px;height:9px;border-radius:50%;background:rgba(240,226,203,.3);display:block}
.dots i.on{background:var(--gold-lt)}
/* nav chrome */
#ctl{position:fixed;right:14px;top:12px;display:flex;gap:6px;z-index:100;opacity:.3;transition:opacity .2s}
#ctl:hover{opacity:1}
#ctl button{background:rgba(255,255,255,.9);border:1px solid #bbb;color:#333;width:29px;height:29px;border-radius:5px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.15);font-size:14px;line-height:1}
#ctl button:hover{background:var(--maroon);color:#fff;border-color:var(--maroon)}
body.on-dark #ctl{opacity:.6}
body.on-dark #ctl button{background:rgba(255,255,255,.12);border-color:rgba(240,226,203,.55);color:#F0E2CB}
body.on-dark #ctl button:hover{background:var(--gold-lt);border-color:var(--gold-lt);color:#3A0008}
body.overlay-open #ctl{opacity:1}
#bar{position:fixed;left:0;bottom:0;height:3px;background:var(--gold);z-index:60;transition:width .22s}
#ov{position:fixed;inset:0;z-index:80;background:rgba(28,10,12,.96);display:none;padding:34px 40px;overflow:auto}
#ov.on{display:block}
#ov h3{color:var(--gold-lt);font-size:14px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 18px}
.ovg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.ovc{background:#fff;border-radius:7px;padding:12px;cursor:pointer;border:2px solid transparent;position:relative;min-height:92px}
.ovc:hover{border-color:var(--gold)}
.ovc .bd{font-size:9px;font-weight:700;color:var(--gold);letter-spacing:.08em}
.ovc .tt{font-size:12px;color:var(--ink);margin-top:5px;line-height:1.35;font-weight:600}
.ovc .no{position:absolute;right:9px;bottom:7px;font-size:11px;color:#bbb;font-weight:700}
.ovc.d{background:var(--maroon-dk)}.ovc.d .tt{color:#F0E2CB}.ovc.d .bd{color:var(--gold-lt)}
#gs,#hp{position:fixed;inset:0;z-index:85;background:rgba(28,10,12,.96);display:none;padding:34px 40px;overflow:auto}
#gs.on,#hp.on{display:block}#hp{z-index:90}
#gs h3,#hp h3{color:var(--gold-lt);font-size:14px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 18px}
.gsg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.gsc{background:#fff;border-radius:6px;padding:11px 13px;border-left:3px solid var(--gold)}
.gsc b{color:var(--maroon);font-size:12.5px;display:block;margin-bottom:3px}
.gsc span{font-size:11.5px;color:#444;line-height:1.45}
#hp .htbl{max-width:560px;background:#fff;border-radius:8px;padding:8px 16px}
#hp .htbl div{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}
#hp .htbl div:last-child{border-bottom:none}
#hp .htbl kbd{background:var(--cream);border:1px solid var(--line);border-radius:4px;padding:1px 7px;font-size:12px;color:var(--maroon);font-weight:700}
#hp .hnote{color:var(--gold-lt);font-size:12px;margin-top:14px;max-width:560px;line-height:1.5}
.gl{border-bottom:1.5px dotted var(--gold);cursor:help;outline:none;text-underline-offset:2px}
.gl:hover,.gl:focus,.gl.on{background:rgba(176,141,46,.16);border-bottom-color:var(--maroon)}
.hl .gl,.slide.divider .gl{border-bottom-color:var(--gold-lt)}
#tip{position:fixed;z-index:140;display:none;max-width:340px;background:#241214;color:#F6EFE6;border:1px solid var(--gold);border-radius:7px;padding:11px 14px;font-size:13px;line-height:1.5;box-shadow:0 10px 28px rgba(0,0,0,.38);pointer-events:none}
#tip b{display:block;color:var(--gold-lt);font-size:13.5px;margin-bottom:4px}
#tip i{display:block;font-style:normal;color:#C9B79A;font-size:11.5px;margin-top:6px}
#rot{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:70;background:rgba(36,18,20,.94);color:#F6EFE6;border:1px solid var(--gold);border-radius:22px;padding:9px 18px;font-size:13px;display:none}
#rot.on{display:block}
@media (max-width:860px){#ctl{opacity:.85;gap:8px;right:10px;top:10px}#ctl button{width:38px;height:38px;font-size:16px}#tip{max-width:78vw;font-size:14px}.ovg{grid-template-columns:repeat(2,1fr)}.gsg{grid-template-columns:1fr}}
@media print{body{background:#fff;overflow:visible}#stage{position:static;display:block}#deck{transform:none!important;width:auto;height:auto}.slide{display:flex!important;position:relative;page-break-after:always}#ctl,#bar,#ov,#hp,#gs,#tip,#rot{display:none!important}@page{size:1280px 720px;margin:0}}
</style></head><body>
<div id="stage"><div id="deck">
'''.replace('%LG%',LG).replace('%MM%',MM).replace('%MI%',MI)

def src(t): return '<div class="src">%s</div>'%t
SRCV='Nguồn: Hệ thống Quản trị Hiệu suất BTMH · trạng thái 06/08/2026. Số mục tiêu 2030 theo Financial Model “Project Imperial” v52.1 (ước tính, chưa kiểm toán).'

def content(eyebrow,tk,body,source=SRCV,dt=None):
    return '<section class="slide" data-t="%s"><div class="eyebrow">%s</div><h1 class="tk">%s</h1><div class="rule"></div><div class="body">%s</div>%s</section>\n'%(tk.replace('"',"'")[:60],eyebrow,tk,body,src(source))

SLIDES=[]
# 1 Cover
SLIDES.append('''<section class="slide cover" data-t="Bìa" data-d="1">
 <div class="clogo"></div>
 <h1>Hệ thống Quản trị Hiệu suất</h1>
 <div class="csub">Nối tầm nhìn dài hạn của BTMH với công việc hằng ngày của mỗi khối, mỗi phòng, mỗi người - và đo được kết quả gần như tức thời.</div>
 <div class="cline"></div>
 <div class="cmeta">
  <div>Loại tài liệu<b>Giới thiệu hệ thống</b></div>
  <div>Đối tượng<b>Người dùng nội bộ</b></div>
  <div>Kỳ dữ liệu<b>Tháng 8/2026</b></div>
  <div>Điều hướng<b>&larr; &rarr; hoặc Space</b></div>
 </div>
</section>\n''')

# 2 Executive summary
SLIDES.append(content('0 · TÓM TẮT ĐIỀU HÀNH',
 'Một nền tảng nối liền chiến lược tới thực thi, giúp <em>mọi mục tiêu, con số và đầu việc luôn nhìn thấy được và có người chịu trách nhiệm</em>.',
 '''<div class="kpis">
  <div class="kpi"><div class="n">5</div><div class="l">mắt xích của chuỗi: chiến lược &rarr; mục tiêu &rarr; đo lường &rarr; hành động &rarr; nhìn lại</div></div>
  <div class="kpi g"><div class="n">8</div><div class="l">phân hệ liên kết chặt trong một nền tảng</div></div>
  <div class="kpi"><div class="n">13<small> khối</small></div><div class="l">&amp; 36 phòng cùng nhịp, cùng hướng</div></div>
  <div class="kpi g"><div class="n">4</div><div class="l">vai trò với cách khai thác riêng: CEO/CFO, GĐ khối, Trưởng phòng, Nhân viên</div></div>
 </div>
 <div class="cols">
  <div class="c60 box"><h4>Bài toán</h4><p>Chiến lược lớn dễ &ldquo;trôi&rdquo; nếu không nối được với hành động hằng ngày. Giữa một kế hoạch nhiều năm và việc một nhân viên làm sáng nay là khoảng cách rất dài - và thường là nơi chiến lược thất thoát.</p></div>
  <div class="c40 hl"><h4>Lời giải</h4><p>Một nơi duy nhất để đặt mục tiêu, đo lường tự động, giao việc, họp - và nhìn lại; ai cũng thấy việc mình phục vụ mục tiêu nào ở trên.</p></div>
 </div>'''))

# 3 TOC
SLIDES.append(content('MỤC LỤC','Bốn phần - từ vì sao, tới phương pháp, các phân hệ, và cách vận hành.',
 '''<div class="cols">
  <div class="c50 card m"><h4>Phần 1 · Bài toán &amp; lời giải</h4><p>Vì sao cần hệ thống; chuỗi giá trị nối chiến lược tới thực thi.</p></div>
  <div class="c50 card"><h4>Phần 2 · Phương pháp</h4><p>OKR, KPI &amp; Thẻ điểm cân bằng, cấu trúc phân cấp, cascade.</p></div>
  <div class="c50 card"><h4>Phần 3 · Các phân hệ &amp; liên kết</h4><p>Bản đồ 8 phân hệ; thực thi, cuộc họp, báo cáo, minh bạch.</p></div>
  <div class="c50 card m"><h4>Phần 4 · Vận hành hiệu quả</h4><p>Dùng theo vai trò, nhịp vận hành, lợi ích cho BTMH.</p></div>
 </div>''',source='Tài liệu tự đứng độc lập - toàn bộ nội dung nằm trong deck này.'))

def divider(pnum,title,lead,dot_on,dots_total=4):
    ds=''.join('<i class="%s"></i>'%('on' if k==dot_on else '') for k in range(dots_total))
    return '<section class="slide divider" data-t="%s" data-d="1"><div class="pnum">%s</div><h2>%s</h2><div class="dlead">%s</div><div class="dots">%s</div></section>\n'%(title.replace('"',"'"),pnum,title,lead,ds)

# 4 Divider 1
SLIDES.append(divider('01','Bài toán &amp; lời giải','Vì sao BTMH cần một nền tảng nối chiến lược tới thực thi - và hình hài của lời giải.',0))

# 5 Problem
SLIDES.append(content('1.1 · BÀI TOÁN',
 'BTMH đặt mục tiêu tăng trưởng mạnh tới 2030 - nhưng <em>chiến lược dễ thất thoát ở khoảng cách giữa kế hoạch và việc làm hằng ngày</em>.',
 '''<div class="kpis">
  <div class="kpi"><div class="n">261</div><div class="l">cửa hàng mục tiêu 2030</div><div class="d">từ 80 năm 2026</div></div>
  <div class="kpi g"><div class="n">~180<small> nghìn tỷ</small></div><div class="l">doanh thu thuần mục tiêu 2030</div></div>
  <div class="kpi"><div class="n">~5<small> nghìn tỷ</small></div><div class="l">lợi nhuận sau thuế mục tiêu 2030</div></div>
  <div class="kpi g"><div class="n">13+36</div><div class="l">khối &amp; phòng cần cùng nhịp</div></div>
 </div>
 <div class="hl"><h4>Câu hỏi cốt lõi</h4><p>Làm sao để mọi mục tiêu, mọi con số, mọi đầu việc - của cả công ty - luôn nhìn thấy được, gắn kết với nhau, và có người chịu trách nhiệm?</p></div>
 <div class="cols">
  <div class="c33 box"><h4>Mục tiêu mờ</h4><p>Chiến lược trên giấy không rõ ai chịu trách nhiệm, đo bằng gì, tới mốc nào.</p></div>
  <div class="c33 box"><h4>Việc rời rạc</h4><p>Đầu việc hằng ngày không nối được với mục tiêu - làm nhiều mà không rõ phục vụ điều gì.</p></div>
  <div class="c33 box"><h4>Số liệu trễ</h4><p>Báo cáo tổng hợp thủ công cuối kỳ - biết vấn đề thì đã muộn để điều chỉnh.</p></div>
 </div>'''))

# 6 Solution chain
SLIDES.append(content('1.2 · LỜI GIẢI',
 'Một chuỗi liền mạch: <em>chiến lược &rarr; mục tiêu &rarr; đo lường &rarr; hành động &rarr; nhìn lại</em> - mỗi mắt xích nối vào mắt xích kế bên.',
 '''<div class="flow">
  <div class="nd"><b>Chiến lược</b><span>Tầm nhìn 2026-2030</span></div><span class="ar">&rarr;</span>
  <div class="nd"><b>OKR</b><span>Mục tiêu &amp; KR</span></div><span class="ar">&rarr;</span>
  <div class="nd"><b>KPI</b><span>Đo sức khỏe</span></div><span class="ar">&rarr;</span>
  <div class="nd"><b>Dự án &amp; Việc</b><span>Việc phải làm</span></div><span class="ar">&rarr;</span>
  <div class="nd"><b>Check-in &amp; Báo cáo</b><span>Nhìn lại</span></div>
 </div>
 <div class="cols">
  <div class="c50 box"><h4>Với người thực thi</h4><p>Ai cũng thấy việc mình làm phục vụ mục tiêu nào của khối, của công ty - làm việc có ngữ cảnh, không rời rạc.</p></div>
  <div class="c50 box"><h4>Với lãnh đạo</h4><p>Thấy chiến lược đang đi tới đâu theo thời gian thực, lần được từ tổng thể xuống tận nơi thực thi.</p></div>
 </div>''',source='Chuỗi giá trị chuẩn của hệ thống - áp dụng cho mọi cấp đơn vị.'))

# 7 Divider 2
SLIDES.append(divider('02','Phương pháp','OKR đặt hướng, KPI theo dõi sức khỏe, và cấu trúc gắn kết mọi thứ theo tổ chức lẫn thời gian.',1))

# 8 OKR method
SLIDES.append(content('2.1 · PHƯƠNG PHÁP OKR',
 '<em>Mục tiêu truyền cảm hứng, đo bằng kết quả cụ thể</em> - hệ thống tự tính % và cuộn lên các cấp.',
 '''<div class="cols">
  <div class="c50 box"><h4>Objective - Mục tiêu</h4><p>Một câu ngắn, tạo động lực, có tính định hướng. Ví dụ: &ldquo;Đưa kênh bán online thành trụ cột tăng trưởng của khối bán lẻ&rdquo;.</p></div>
  <div class="c50 box"><h4>Key Results - Kết quả then chốt</h4><p>2-5 con số đo được, có mốc đầu kỳ &rarr; mục tiêu. Mỗi <span class="gl" data-t="KR" data-d="Key Result: kết quả then chốt đo được của một Objective, có mốc đầu kỳ và mục tiêu.">KR</span> có trọng số nói lên mức đóng góp.</p></div>
 </div>
 <div class="hl"><h4>Tự động cuộn tiến độ</h4><p>Hệ thống tự tính % hoàn thành của từng KR, rồi cuộn lên Mục tiêu, lên Khối, lên Công ty - không cần cộng tay.</p></div>
 <div class="chartwrap"><div class="ct">Ví dụ một OKR cấp khối</div>
  <table class="t" style="margin-top:2px"><tr><th>Objective &amp; Key Results</th><th style="width:150px">Đầu kỳ &rarr; Mục tiêu</th><th style="width:70px">Trọng số</th></tr>
  <tr><td class="em">O: Đưa kênh online thành trụ cột tăng trưởng bán lẻ</td><td class="n">-</td><td class="n">-</td></tr>
  <tr><td>KR1 &middot; Doanh thu online</td><td class="n">18 &rarr; 56 tỷ</td><td class="n">40%</td></tr>
  <tr><td>KR2 &middot; Tỷ lệ đơn hoàn thành</td><td class="n">92% &rarr; 98%</td><td class="n">35%</td></tr>
  <tr><td>KR3 &middot; Chi phí thu hút khách/đơn</td><td class="n">220k &rarr; 150k đ</td><td class="n">25%</td></tr>
  </table></div>''',source='Phương pháp OKR (Objectives &amp; Key Results) - chuẩn quản trị mục tiêu hiện đại. Ví dụ minh họa.'))

# 9 KPI & BSC
SLIDES.append(content('2.2 · KPI &amp; THẺ ĐIỂM CÂN BẰNG',
 'OKR đặt hướng đi; <em>KPI theo dõi sức khỏe vận hành</em> - nhiều chỉ số tự lấy từ dữ liệu bán hàng.',
 '''<div class="cols">
  <div class="c50 box"><h4>KPI - chỉ số thường trực</h4><p>Doanh thu, lãi gộp, sản lượng, tồn kho, số hóa đơn... có ngưỡng Theo dõi &middot; Cảnh báo &middot; Báo động. Cập nhật nhiều lần mỗi ngày, không nhập tay.</p></div>
  <div class="c50 box"><h4><span class="gl" data-t="BSC" data-d="Balanced Scorecard - Thẻ điểm cân bằng: nhìn doanh nghiệp qua 4 mặt Tài chính, Khách hàng, Quy trình nội bộ, Học hỏi &amp; phát triển.">BSC</span> - nhìn 4 mặt</h4><p>Tài chính &middot; Khách hàng &middot; Quy trình nội bộ &middot; Học hỏi &amp; phát triển. Không chỉ chạy theo doanh số mà bỏ quên con người, quy trình, khách hàng.</p></div>
 </div>
 <div class="kpis">
  <div class="kpi"><div class="n">Doanh thu</div><div class="l">theo ngày &amp; lũy kế kỳ</div></div>
  <div class="kpi g"><div class="n">Lãi gộp</div><div class="l">biên &amp; giá trị tuyệt đối</div></div>
  <div class="kpi"><div class="n">Sản lượng</div><div class="l">theo chỉ, theo nhóm hàng</div></div>
  <div class="kpi g"><div class="n">Tồn kho</div><div class="l">giá trị &amp; số ngày bán</div></div>
 </div>
 <ul class="tick">
  <li>OKR trả lời &ldquo;ta thay đổi điều gì&rdquo;; KPI trả lời &ldquo;nền tảng có đang khỏe không&rdquo; - hai lớp bổ trợ nhau.</li>
  <li>Chỉ số tụt dưới ngưỡng sẽ tự đổi màu và nổi lên ở báo cáo &amp; bản tin - lãnh đạo thấy ngay điểm cần can thiệp.</li>
 </ul>''',source='KPI tự động từ dữ liệu bán hàng; ngưỡng Theo dõi/Cảnh báo/Báo động cấu hình theo từng chỉ số.'))

# 10 Cascade tree (SVG)
CASC='''<div class="chartwrap"><div class="ct">Cascade: một mục tiêu công ty rải xuống tới từng người</div>
<svg viewBox="0 0 960 300" style="width:100%;max-height:360px">
 <path d="M480 54 C480 84,250 84,250 112" fill="none" stroke="#B08D2E" stroke-width="1.6" opacity=".55"/>
 <path d="M480 54 C480 84,710 84,710 112" fill="none" stroke="#B08D2E" stroke-width="1.6" opacity=".55"/>
 <path d="M250 160 C250 182,150 182,150 206" fill="none" stroke="#B08D2E" stroke-width="1.6" opacity=".55"/>
 <path d="M250 160 C250 182,350 182,350 206" fill="none" stroke="#B08D2E" stroke-width="1.6" opacity=".55"/>
 <path d="M710 160 C710 182,610 182,610 206" fill="none" stroke="#B08D2E" stroke-width="1.6" opacity=".55"/>
 <path d="M710 160 C710 182,810 182,810 206" fill="none" stroke="#B08D2E" stroke-width="1.6" opacity=".55"/>
 <rect x="368" y="18" width="224" height="36" rx="7" fill="#7C0312"/><text x="480" y="41" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Mục tiêu Công ty</text>
 <rect x="160" y="112" width="180" height="48" rx="7" fill="#EFE3C4" stroke="#E2DCD3"/><text x="250" y="132" text-anchor="middle" fill="#1C1C1C" font-size="13" font-weight="700">Khối Kinh doanh</text><text x="250" y="150" text-anchor="middle" fill="#6B6B6B" font-size="10.5">OKR khối</text>
 <rect x="620" y="112" width="180" height="48" rx="7" fill="#EFE3C4" stroke="#E2DCD3"/><text x="710" y="132" text-anchor="middle" fill="#1C1C1C" font-size="13" font-weight="700">Khối Sản phẩm</text><text x="710" y="150" text-anchor="middle" fill="#6B6B6B" font-size="10.5">OKR khối</text>
 <rect x="72" y="206" width="156" height="42" rx="7" fill="#fff" stroke="#E2DCD3"/><text x="150" y="232" text-anchor="middle" fill="#1C1C1C" font-size="12">Phòng Ecom</text>
 <rect x="272" y="206" width="156" height="42" rx="7" fill="#fff" stroke="#E2DCD3"/><text x="350" y="232" text-anchor="middle" fill="#1C1C1C" font-size="12">Phòng Bán buôn</text>
 <rect x="532" y="206" width="156" height="42" rx="7" fill="#fff" stroke="#E2DCD3"/><text x="610" y="232" text-anchor="middle" fill="#1C1C1C" font-size="12">Phòng Phát triển SP</text>
 <rect x="732" y="206" width="156" height="42" rx="7" fill="#fff" stroke="#E2DCD3"/><text x="810" y="232" text-anchor="middle" fill="#1C1C1C" font-size="12">Phòng QLDA</text>
 <text x="150" y="278" text-anchor="middle" fill="#6B6B6B" font-size="11">Việc &amp; KR cá nhân</text>
 <text x="610" y="278" text-anchor="middle" fill="#6B6B6B" font-size="11">Việc &amp; KR cá nhân</text>
</svg></div>
<p style="text-align:center;color:var(--grey);font-size:12.5px">Nhìn một sơ đồ là hiểu: việc của một nhân viên cuối cùng phục vụ mục tiêu nào của công ty.</p>'''
SLIDES.append(content('2.3 · CẤU TRÚC &amp; CASCADE',
 'Gắn kết theo cả tổ chức lẫn thời gian - <em>một con số luôn trả lời được: của ai, thuộc mục tiêu nào, kỳ nào</em>.',
 CASC, source='Cây tổ chức Công ty &rarr; Khối &rarr; Phòng &rarr; Cá nhân; khung thời gian Nhiều năm &rarr; Năm &rarr; Quý &rarr; Tháng &rarr; Tuần.'))

# 11 Divider 3
SLIDES.append(divider('03','Các phân hệ &amp; liên kết','Tám phân hệ không rời rạc - một công việc gắn với KR của một OKR, thuộc một dự án, giao trong một cuộc họp.',2))

# 12 Module map
def mod(ic,name,desc): return '<div class="c25 box" style="flex:0 1 calc(25%% - 17px)"><h4>%s %s</h4><p>%s</p></div>'%(ic,name,desc)
MODS='<div class="cols">'+''.join([
 mod('&#127919;','Chiến lược','Tầm nhìn, trụ cột, BSC'),
 mod('&#128202;','OKR','Mục tiêu, cascade, check-in'),
 mod('&#128200;','KPI &amp; Scorecard','Chỉ số tự động, cảnh báo'),
 mod('&#128451;','Dự án &amp; Việc','Danh sách &middot; Kanban &middot; Gantt'),
 mod('&#128197;','Cuộc họp','Giao việc, biên bản, nối chuỗi'),
 mod('&#128240;','Báo cáo &amp; Bản tin','Họp điều hành, khuyến nghị'),
 mod('&#128100;','Hồ sơ 360&deg;','Toàn cảnh mỗi người'),
 mod('&#128737;','Toàn vẹn dữ liệu','Tự soi lỗ hổng, mồ côi'),
])+'</div>'
SLIDES.append(content('3.1 · BẢN ĐỒ HỆ THỐNG',
 'Tám phân hệ liên kết chặt - <em>một công việc gắn với KR của một OKR, thuộc một dự án, giao trong một cuộc họp, hiện ở báo cáo &amp; hồ sơ</em>.',
 MODS+'<div class="hl"><h4>Không rời rạc</h4><p>Chính sự liên kết này làm dữ liệu nhất quán một chiều: cập nhật ở một nơi, mọi nơi liên quan tự phản ánh.</p></div>',
 source='Kiến trúc phân hệ của hệ thống - 8 phân hệ trong một nền tảng.'))

# 13 Execution
SLIDES.append(content('3.2 · PHÂN HỆ THỰC THI',
 'Biến mục tiêu thành <em>việc làm được, theo dõi được</em> - 3 cách nhìn và ràng buộc thứ tự.',
 '''<div class="cols">
  <div class="c33 box"><h4>Dự án xuyên OKR</h4><p>Một dự án gom việc từ nhiều khối/OKR; có cây Dự án &rarr; Tiểu dự án &rarr; Công việc và ngân sách.</p></div>
  <div class="c33 box"><h4>3 cách nhìn</h4><p><b>Danh sách</b> để lọc, <b>Kanban</b> để kéo-thả theo trạng thái, <b>Gantt</b> để xem theo dòng thời gian.</p></div>
  <div class="c33 box"><h4>Ràng buộc &amp; hạn</h4><p>Việc có thể phụ thuộc việc khác (waterfall); cảnh báo quá hạn / sắp đến hạn / đang chờ việc trước.</p></div>
 </div>
 <ul class="tick"><li>Mỗi việc biết nó thuộc mục tiêu nào, ai phụ trách, bao giờ xong - và tiến độ tự cuộn ngược lên OKR.</li>
 <li>Bấm một việc mở chi tiết trước, rồi mới bấm Sửa - kèm thảo luận ngay tại việc.</li></ul>''',
 source='Phân hệ Dự án &amp; Công việc - quản trị thực thi gắn OKR.'))

# 14 Meetings + reporting
SLIDES.append(content('3.3 · CUỘC HỌP &amp; BÁO CÁO',
 'Họp ra quyết định thành việc có chủ; <em>báo cáo biến dữ liệu thô thành nhận định để hành động</em>.',
 '''<div class="cols">
  <div class="c50 stack">
   <div class="box"><h4>Cuộc họp điều hành</h4><p>Lịch họp theo loại; chủ trì, đồng chủ trì &amp; thư ký đều biên tập được; giao việc ngay tại họp; biên bản, quyết định, nối chuỗi họp.</p></div>
   <div class="card"><h4>Kết quả</h4><p>Cuộc họp không kết thúc bằng một biên bản để đó, mà bằng những đầu việc đã có người &amp; hạn trong hệ thống.</p></div>
  </div>
  <div class="c50 stack">
   <div class="box"><h4>Báo cáo &amp; bản tin</h4><p>Trang Họp điều hành tổng hợp một kỳ; bản tin tuần tự gửi lãnh đạo; nhận định theo mẫu Quan sát &rarr; Hàm ý &rarr; Khuyến nghị.</p></div>
   <div class="card m"><h4>Tự sinh</h4><p>Bản tin tuần &amp; báo cáo kỳ được hệ thống tổng hợp sẵn - không ai phải gom số thủ công.</p></div>
  </div>
 </div>
 <div class="hl"><h4>Minh bạch, không &ldquo;số trơ&rdquo;</h4><p>Mọi con số tổng hợp đều bấm được để truy ngược tới danh sách đích danh các mục cấu thành.</p></div>''',
 source='Phân hệ Cuộc họp điều hành &amp; Báo cáo/Bản tin tuần.'))

# 15 KPI chart (SVG)
def bar(x,val,cls,lbl):
    h=val*1.5; y=210-h
    return '<rect x="%d" y="60" width="66" height="150" rx="5" fill="#E2DCD3" opacity=".35"/><rect x="%d" y="%.1f" width="66" height="%.1f" rx="5" fill="%s"/><text x="%d" y="%.1f" text-anchor="middle" fill="#1C1C1C" font-size="12.5" font-weight="700">%d%%</text><text x="%d" y="232" text-anchor="middle" fill="#6B6B6B" font-size="12">%s</text>'%(x,x,y,h,cls,x+33,y-8,val,x+33,lbl)
KC='''<div class="chartwrap"><div class="ct">Bảng điểm KPI - thực hiện so với mục tiêu, màu theo ngưỡng</div>
<svg viewBox="0 0 900 260" style="width:88%;margin:0 auto;display:block">
 <line x1="110" y1="60" x2="840" y2="60" stroke="#E2DCD3" stroke-dasharray="3 4"/>
 <line x1="110" y1="135" x2="840" y2="135" stroke="#E2DCD3" stroke-dasharray="3 4"/>
 <line x1="110" y1="210" x2="840" y2="210" stroke="#E2DCD3"/>
 <text x="104" y="64" text-anchor="end" fill="#6B6B6B" font-size="11">100%</text>
 <text x="104" y="139" text-anchor="end" fill="#6B6B6B" font-size="11">50%</text>
 <text x="104" y="214" text-anchor="end" fill="#6B6B6B" font-size="11">0%</text>
 <line x1="110" y1="60" x2="840" y2="60" stroke="#B08D2E" stroke-width="1.4" stroke-dasharray="6 4"/>
 __BARS__
</svg>
<div class="lg"><span><i style="background:#2E6B4F"></i>Đạt</span><span><i style="background:#B4741A"></i>Theo dõi / Cảnh báo</span><span><i style="background:#A32218"></i>Báo động</span></div></div>'''
BARS=bar(160,82,'#2E6B4F','Doanh thu')+bar(340,76,'#B4741A','Lãi gộp')+bar(520,91,'#2E6B4F','Sản lượng')+bar(700,63,'#A32218','Số hóa đơn')
KC=KC.replace('__BARS__',BARS)
SLIDES.append(content('3.4 · MINH HỌA BẢNG ĐIỂM KPI',
 'Số liệu tự chảy vào; <em>ô nào tụt dưới ngưỡng sẽ đổi màu và nổi lên ở báo cáo</em> - không cần ai canh bảng tính.',
 KC, source='Minh họa - giá trị mô phỏng. Trên hệ thống, số thực hiện lấy tự động từ dữ liệu bán hàng theo thời gian thực.'))

# 16 Trust
SLIDES.append(content('3.5 · MINH BẠCH &amp; TIN CẬY',
 'Ai làm gì, dữ liệu có sạch không, ai được xem gì - <em>hệ thống chủ động chỉ ra chỗ chưa ổn để sửa sớm</em>.',
 '''<div class="cols">
  <div class="c33 box"><h4>Hồ sơ 360&deg;</h4><p>Bấm tên một người &rarr; xem toàn cảnh: đơn vị, OKR chủ trì, dự án, công việc, quá hạn, cuộc họp.</p></div>
  <div class="c33 box"><h4>Toàn vẹn dữ liệu</h4><p>Tự soi lỗ hổng: OKR chưa cascade, KR chưa có việc, dự án rỗng, ngân sách lệch, ràng buộc gắn nhầm.</p></div>
  <div class="c33 box"><h4>Phân quyền theo vai trò</h4><p>Điều hành xem toàn cảnh; nhân viên xem trong phạm vi đơn vị mình; quyền sửa giới hạn theo trách nhiệm.</p></div>
 </div>
 <div class="cols">
  <div class="c60 hl"><h4>Chủ động, không chờ phát hiện</h4><p>Hệ thống không chỉ lưu số - nó tự chỉ ra chỗ chưa ổn (OKR mồ côi, KR chưa có việc, số lệch kỳ) để sửa sớm, trước khi thành vấn đề.</p></div>
  <div class="c40 stack">
   <div class="card"><h4>Tin cậy để ra quyết định</h4><p>Mỗi con số đều truy được về nguồn và người chịu trách nhiệm.</p></div>
  </div>
 </div>''',source='Phân hệ Hồ sơ 360&deg;, Toàn vẹn dữ liệu, và Phân quyền theo vai trò.'))

# 17 Divider 4
SLIDES.append(divider('04','Vận hành hiệu quả','Mỗi vai trò một cách khai thác, đưa hệ thống vào nhịp thói quen - và lợi ích thu về.',3))

# 18 Roles
SLIDES.append(content('4.1 · DÙNG THEO VAI TRÒ',
 'Mỗi vai trò một cách khai thác - <em>từ điều hành toàn cảnh tới tập trung việc của mình</em>.',
 '''<table class="t"><tr><th style="width:150px">Vai trò</th><th>Khai thác chính</th></tr>
 <tr><td class="em">CEO / CFO</td><td>Theo dõi tiến độ công ty &amp; các khối, sức khỏe OKR, cảnh báo KPI; chủ trì họp điều hành, nhận bản tin tuần.</td></tr>
 <tr><td class="em">Giám đốc khối</td><td>Cascade mục tiêu công ty xuống phòng, phân bổ dự án/việc, duyệt check-in, xử lý việc quá hạn của khối.</td></tr>
 <tr><td class="em">Trưởng phòng</td><td>Giao việc cho nhân viên, theo dõi Kanban/Gantt của phòng, cập nhật KR, chuẩn bị số liệu họp.</td></tr>
 <tr><td class="em">Nhân viên</td><td>Trang &ldquo;Của tôi&rdquo;: tổng quan công việc, cập nhật trạng thái &amp; tiến độ; xem OKR trong phạm vi đơn vị mình.</td></tr>
 </table>''',source='Phân quyền &amp; luồng sử dụng theo 4 nhóm vai trò của hệ thống.'))

# 19 Rhythm
SLIDES.append(content('4.2 · NHỊP VẬN HÀNH',
 'Đưa hệ thống vào <em>thói quen - không phải sự kiện</em>: 4 nhịp ngày / tuần / tháng / quý.',
 '''<ol class="num">
 <li><b>Hằng ngày.</b> Nhân viên cập nhật trạng thái việc; trưởng phòng nhìn Kanban để gỡ vướng.</li>
 <li><b>Hằng tuần.</b> Check-in KR + độ tự tin; họp điều hành tuần giao/rà việc; hệ thống gửi bản tin.</li>
 <li><b>Hằng tháng.</b> Rà KPI theo ngưỡng, sức khỏe OKR, ngân sách; đọc Nhận định &amp; Khuyến nghị để điều chỉnh.</li>
 <li><b>Hằng quý.</b> Chấm điểm OKR, đặt OKR kỳ mới, soi Toàn vẹn dữ liệu trước khi bước sang kỳ.</li>
 </ol>''',source='Nhịp vận hành đề xuất (best practice) cho triển khai OKR/KPI.'))

# 20 Benefits
SLIDES.append(content('4.3 · LỢI ÍCH CHO BTMH',
 'Năm lợi ích cốt lõi - <em>chiến lược không thất thoát, quyết định nhanh &amp; đúng, trách nhiệm rõ ràng</em>.',
 '''<div class="cols">
  <div class="c50 stack">
   <div class="card m"><h4>Chiến lược không thất thoát</h4><p>Từ tầm nhìn tới việc của mỗi người đều nhìn thấy và nối liền.</p></div>
   <div class="card"><h4>Ra quyết định nhanh &amp; đúng</h4><p>Số liệu tươi, cảnh báo sớm, khuyến nghị sẵn.</p></div>
   <div class="card"><h4>Trách nhiệm rõ ràng</h4><p>Mỗi mục tiêu, mỗi việc đều có chủ và có hạn.</p></div>
  </div>
  <div class="c50 stack">
   <div class="card"><h4>Tiết kiệm thời gian tổng hợp</h4><p>Báo cáo &amp; bản tin tự sinh, thay cho gom số thủ công.</p></div>
   <div class="hl"><h4>Sẵn sàng cho quy mô lớn</h4><p>Chuẩn hóa cách vận hành khi công ty mở rộng tới hàng trăm điểm bán - nền tảng lớn cùng doanh nghiệp.</p></div>
  </div>
 </div>''',source='Lợi ích kỳ vọng khi vận hành hệ thống đúng nhịp; gắn với mục tiêu tăng trưởng 2026-2030.'))

# 21 Method note + changelog
SLIDES.append(content('4.4 · LƯU Ý &amp; NHẬT KÝ CẬP NHẬT',
 'Vài lưu ý khi đọc, và <em>hệ thống được nâng cấp liên tục</em>.',
 '''<div class="cols">
  <div class="c40 box"><h4>Lưu ý phương pháp</h4><ul class="tick" style="margin-top:4px">
   <li>Số mục tiêu 2030 là kế hoạch theo Financial Model, chưa kiểm toán.</li>
   <li>Minh họa KPI dùng giá trị mô phỏng; số thật lấy tự động trên hệ thống.</li>
   <li>Deck là bản rút gọn - bản đầy đủ ở mục &ldquo;Hướng dẫn&rdquo; trong hệ thống.</li>
  </ul></div>
  <div class="c60 box"><h4>Nhật ký cập nhật</h4>
   <table class="t sm" style="font-size:11.6px"><tr><th style="width:112px">Thời điểm</th><th>Nội dung</th></tr>
   <tr><td class="em">06/08/2026</td><td>Hồ sơ 360&deg;; tổng quan việc ở &ldquo;Của tôi&rdquo;; dropdown đơn vị theo cây + tìm kiếm; nhân viên xem OKR trong phạm vi đơn vị; xem chi tiết việc trước khi sửa.</td></tr>
   <tr><td class="em">05/08/2026</td><td>Ràng buộc waterfall giữa việc; cuộc họp nhiều đồng chủ trì &amp; thư ký; trang Công việc phân trang/sắp xếp/format số.</td></tr>
   <tr><td class="em">02-03/08/2026</td><td>Họp điều hành (WBR/MBR); bản tin tuần; Sức khỏe OKR; Nhận định &amp; Khuyến nghị; Toàn vẹn dữ liệu.</td></tr>
   <tr><td class="em">31/07/2026</td><td>KPI tự động; Thư viện KPI &amp; Scorecard theo BSC; quản trị dự án gắn OKR; nhắc check-in.</td></tr>
   </table></div>
 </div>''',source='Nhật ký rút gọn - bản đầy đủ trong mục Hướng dẫn của hệ thống.'))

# 22 Closing
SLIDES.append('''<section class="slide cover" data-t="Kết thúc" data-d="1">
 <div class="clogo"></div>
 <h1 style="font-size:46px">Cảm ơn.</h1>
 <div class="csub">Hệ thống Quản trị Hiệu suất BTMH - từ chiến lược tới thực thi.</div>
 <div class="cline"></div>
 <div class="cmeta">
  <div>Đối tượng<b>Người dùng nội bộ BTMH</b></div>
  <div>Kỳ dữ liệu<b>Tháng 8/2026</b></div>
  <div>Điều hướng<b>&larr; &rarr; · phím O xem lưới · G bảng thuật ngữ</b></div>
 </div>
</section>\n''')

# Glossary dictionary (JS)
GLOSS = {
 'OKR':'Objectives &amp; Key Results - phương pháp quản trị mục tiêu: đặt Mục tiêu định tính và 2-5 Kết quả then chốt đo được.',
 'KR':'Key Result - kết quả then chốt đo được của một Objective, có mốc đầu kỳ và mục tiêu.',
 'KPI':'Key Performance Indicator - chỉ số hiệu suất then chốt, theo dõi sức khỏe vận hành theo thời gian.',
 'BSC':'Balanced Scorecard - Thẻ điểm cân bằng: nhìn doanh nghiệp qua 4 mặt Tài chính, Khách hàng, Quy trình nội bộ, Học hỏi &amp; phát triển.',
 'Kanban':'Bảng cột theo trạng thái (Chưa làm / Đang làm / Xong...), kéo-thả thẻ việc giữa các cột.',
 'Gantt':'Biểu đồ thanh theo dòng thời gian, thể hiện ngày bắt đầu - hạn của từng việc.',
 'cascade':'Rải mục tiêu từ cấp trên xuống cấp dưới (Công ty &rarr; Khối &rarr; Phòng &rarr; Cá nhân) để mọi cấp align cùng hướng.',
 'waterfall':'Ràng buộc thứ tự: một việc phải chờ việc tiên quyết hoàn thành trước mới bắt đầu.',
 'check-in':'Cập nhật tiến độ định kỳ (thường hằng tuần) kèm mức độ tự tin đạt mục tiêu.',
 'WBR':'Weekly Business Review - họp rà soát kết quả kinh doanh hằng tuần.',
 'MBR':'Monthly Business Review - họp rà soát kết quả kinh doanh hằng tháng.',
 'roll-up':'Cuộn/gộp tiến độ từ cấp thấp lên cấp cao theo trọng số.',
}
import json
GLOSS_JS = json.dumps(GLOSS, ensure_ascii=False)

TAIL = '''</div></div>
<div id="ctl">
 <button data-a="first" title="Về slide 1 (Home)">&#8945;</button>
 <button data-a="prev" title="Slide trước (←)">&#8249;</button>
 <button data-a="next" title="Slide sau (→)">&#8250;</button>
 <button data-a="ov" title="Lưới tổng quan (O)">&#9638;</button>
 <button data-a="gs" title="Bảng thuật ngữ (G)">Aa</button>
 <button data-a="fs" title="Toàn màn hình (F)">&#9970;</button>
 <button data-a="print" title="In / PDF (P)">&#9113;</button>
 <button data-a="hp" title="Trợ giúp phím tắt (?)">?</button>
</div>
<div id="bar"></div>
<div id="ov"><h3>Tổng quan các slide - bấm để nhảy tới</h3><div class="ovg" id="ovg"></div></div>
<div id="gs"><h3>Bảng thuật ngữ</h3><div class="gsg" id="gsg"></div></div>
<div id="hp"><h3>Phím tắt &amp; thao tác</h3><div class="htbl" id="htbl"></div>
 <div class="hnote">Trên điện thoại: vuốt trái/phải để chuyển slide; chạm vào từ gạch chân để xem giải nghĩa. Cầm dọc, khung tự xoay ngang để chữ to, dễ đọc.</div></div>
<div id="tip"></div>
<div id="rot">&#8635; Xoay ngang thiết bị để xem rõ hơn</div>
<script>
var GLOSS=__GLOSS__;
(function(){
 var S=[].slice.call(document.querySelectorAll('.slide')),N=S.length,i=0,buf='',rotated=false;
 var deck=document.getElementById('deck'),bar=document.getElementById('bar');
 var ov=document.getElementById('ov'),gs=document.getElementById('gs'),hp=document.getElementById('hp');
 var tip=document.getElementById('tip'),rot=document.getElementById('rot');
 var COVER_BG='linear-gradient(135deg,#5E0210 0%,#7C0312 45%,#96122A 100%)';

 // footer logo + page number (KHÔNG lặp HTML)
 S.forEach(function(s,k){
   if(s.classList.contains('cover')) return;
   var p=document.createElement('div');p.className='pg bm';
   p.innerHTML='<i></i><span class="wm">BẢO TÍN MẠNH HẢI</span><b class="num">'+(k+1)+'</b> / '+N;
   s.appendChild(p);
 });

 // ---- tooltip auto-annotate ----
 function esc(s){return s.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');}
 var VN='A-Za-z0-9\\u00C0-\\u024F\\u1E00-\\u1EFF';
 var terms=Object.keys(GLOSS).sort(function(a,b){return b.length-a.length;});
 function annotate(){
   S.forEach(function(s){
     terms.forEach(function(term){
       var ci=/[a-z]/.test(term)&&term!==term.toUpperCase();
       var re=new RegExp('(^|[^'+VN+'])('+esc(term)+')(?![' +VN+'])', ci?'i':'');
       var tw=document.createTreeWalker(s,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
         if(!n.nodeValue||!n.nodeValue.trim())return NodeFilter.FILTER_REJECT;
         var p=n.parentElement;
         if(!p)return NodeFilter.FILTER_REJECT;
         if(p.closest('svg,script,style,defs,.src,.pg,.gl'))return NodeFilter.FILTER_REJECT;
         return re.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
       }});
       var node=tw.nextNode();
       if(!node)return;
       var m=re.exec(node.nodeValue); if(!m)return;
       var idx=m.index+m[1].length, len=m[2].length;
       var after=node.splitText(idx); after.splitText(len);
       var span=document.createElement('span');
       span.className='gl';span.tabIndex=0;span.setAttribute('data-t',term);span.setAttribute('data-d',GLOSS[term]);
       span.textContent=after.nodeValue; after.parentNode.replaceChild(span,after);
     });
   });
 }
 annotate();
 // manual data-d (những chỗ đã gắn tay trong HTML) cũng dùng chung tooltip
 function tipFor(el){return {t:el.getAttribute('data-t'),d:el.getAttribute('data-d')||GLOSS[el.getAttribute('data-t')]||''};}
 function showTip(el){
   var g=tipFor(el); if(!g.d)return;
   tip.innerHTML='<b>'+g.t+'</b>'+g.d;
   tip.style.display='block';
   var r=el.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;
   var left=Math.min(Math.max(8,r.left+r.width/2-tw/2),innerWidth-tw-8);
   var top=r.top-th-10; if(top<8)top=r.bottom+10;
   tip.style.left=left+'px';tip.style.top=top+'px';
 }
 function closeTip(){tip.style.display='none';document.querySelectorAll('.gl.on').forEach(function(e){e.classList.remove('on');});}
 document.addEventListener('mouseover',function(e){var g=e.target.closest('.gl');if(g)showTip(g);});
 document.addEventListener('focusin',function(e){var g=e.target.closest&&e.target.closest('.gl');if(g)showTip(g);});
 document.addEventListener('mouseout',function(e){if(e.target.closest&&e.target.closest('.gl'))closeTip();});
 document.addEventListener('click',function(e){var g=e.target.closest('.gl');if(g){e.stopPropagation();if(tip.style.display==='block'){closeTip();}else{g.classList.add('on');showTip(g);}}else{closeTip();}});

 function overlayOpen(){return ov.classList.contains('on')||gs.classList.contains('on')||hp.classList.contains('on');}
 function syncChrome(dark){
   var op=overlayOpen();document.body.classList.toggle('overlay-open',op);
   document.body.classList.toggle('on-dark', op||(dark!==undefined?dark:(S[i].classList.contains('cover')||S[i].classList.contains('divider'))));
 }
 function paintBg(){
   var s=S[i],dark=s.classList.contains('cover')||s.classList.contains('divider');
   document.body.style.background=s.classList.contains('cover')?COVER_BG:(s.classList.contains('divider')?'#54000C':'#FFFFFF');
   syncChrome(dark);
 }
 function show(n){
   if(n<0)n=0;if(n>N-1)n=N-1;closeTip();
   S[i].classList.remove('active');i=n;S[i].classList.add('active');
   bar.style.width=((i+1)/N*100)+'%';paintBg();
   if(location.hash!=='#'+(i+1))history.replaceState(null,'','#'+(i+1));
 }
 function closeAll(){ov.classList.remove('on');gs.classList.remove('on');hp.classList.remove('on');syncChrome();}
 function next(){if(!overlayOpen())show(i+1);}
 function prev(){if(!overlayOpen())show(i-1);}
 function toggleOv(){gs.classList.remove('on');hp.classList.remove('on');ov.classList.toggle('on');syncChrome();}
 function toggleGs(){ov.classList.remove('on');hp.classList.remove('on');gs.classList.toggle('on');syncChrome();}
 function toggleHp(){ov.classList.remove('on');gs.classList.remove('on');hp.classList.toggle('on');syncChrome();}
 function fs(){if(!document.fullscreenElement)document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();else document.exitFullscreen&&document.exitFullscreen();}

 // overview grid
 (function(){var g=document.getElementById('ovg');S.forEach(function(s,k){
   var c=document.createElement('div');c.className='ovc'+(s.dataset.d?' d':'');
   c.innerHTML='<div class="bd">SLIDE '+(k+1)+'</div><div class="tt">'+(s.dataset.t||'')+'</div><div class="no">'+(k+1)+'</div>';
   c.onclick=function(){toggleOv();show(k);};g.appendChild(c);});})();
 // glossary panel
 (function(){var g=document.getElementById('gsg');Object.keys(GLOSS).sort().forEach(function(t){
   var c=document.createElement('div');c.className='gsc';c.innerHTML='<b>'+t+'</b><span>'+GLOSS[t]+'</span>';g.appendChild(c);});})();
 // help table
 (function(){var rows=[['← / → / Space','Chuyển slide'],['Home / End','Slide đầu / cuối'],['Số + Enter','Nhảy tới slide'],['O','Lưới tổng quan'],['G','Bảng thuật ngữ'],['F','Toàn màn hình'],['P','In / xuất PDF'],['? / H','Trợ giúp'],['Esc','Đóng lớp phủ']];
   var h=document.getElementById('htbl');rows.forEach(function(r){var d=document.createElement('div');d.innerHTML='<span>'+r[1]+'</span><kbd>'+r[0]+'</kbd>';h.appendChild(d);});})();

 document.getElementById('ctl').addEventListener('click',function(e){
   var b=e.target.closest('button');if(!b)return;var a=b.dataset.a;
   if(a==='first')show(0);else if(a==='prev')prev();else if(a==='next')next();
   else if(a==='ov')toggleOv();else if(a==='gs')toggleGs();else if(a==='fs')fs();
   else if(a==='print')window.print();else if(a==='hp')toggleHp();
 });
 document.addEventListener('keydown',function(e){var k=e.key;
   if(k==='Escape'){closeAll();closeTip();return;}
   if(k==='o'||k==='O'){toggleOv();return;}if(k==='g'||k==='G'){toggleGs();return;}
   if(k==='f'||k==='F'){fs();return;}if(k==='p'||k==='P'){window.print();return;}
   if(k==='?'||k==='h'||k==='H'){toggleHp();return;}
   if(overlayOpen())return;
   if(k==='ArrowRight'||k===' '||k==='PageDown'){e.preventDefault();next();buf='';return;}
   if(k==='ArrowLeft'||k==='PageUp'){e.preventDefault();prev();buf='';return;}
   if(k==='Home'){e.preventDefault();show(0);return;}if(k==='End'){e.preventDefault();show(N-1);return;}
   if(/^[0-9]$/.test(k)){buf+=k;return;}
   if(k==='Enter'&&buf){show(parseInt(buf,10)-1);buf='';return;}
 });
 ov.addEventListener('click',function(e){if(e.target===ov)toggleOv();});
 gs.addEventListener('click',function(e){if(e.target===gs)toggleGs();});
 hp.addEventListener('click',function(e){if(e.target===hp)toggleHp();});

 // touch swipe
 var tx=0,ty=0;
 deck.addEventListener('touchstart',function(e){tx=e.changedTouches[0].clientX;ty=e.changedTouches[0].clientY;},{passive:true});
 deck.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
   if(rotated){if(Math.abs(dy)>45&&Math.abs(dy)>Math.abs(dx)){dy<0?next():prev();}}
   else{if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){dx<0?next():prev();}}},{passive:true});

 function fit(){var w=innerWidth,h=innerHeight,s;rotated=(w<820&&h>w);
   if(rotated){s=Math.min(h/1280,w/720);deck.style.transform='rotate(90deg) scale('+s+')';rot.classList.add('on');clearTimeout(fit._t);fit._t=setTimeout(function(){rot.classList.remove('on');},6000);}
   else{s=Math.min(w/1280,h/720);deck.style.transform='scale('+s+')';rot.classList.remove('on');}closeTip();}
 window.addEventListener('resize',fit);fit();

 var hh=parseInt((location.hash||'').replace('#',''),10);
 show(isNaN(hh)?0:hh-1);
})();
</script></body></html>'''
TAIL = TAIL.replace('__GLOSS__', GLOSS_JS)

html = HEAD + ''.join(SLIDES) + TAIL
out = os.path.join(D,'deck.html')
open(out,'w',encoding='utf-8').write(html)
print('KB', round(len(html.encode())/1024,1))
print('sections', html.count('<section class="slide'), '/', html.count('</section>'))
print('div', html.count('<div'), html.count('</div>'))
print('svg', html.count('<svg'), html.count('</svg>'))
print('slides(logical)', len(SLIDES))
print('written', out)
