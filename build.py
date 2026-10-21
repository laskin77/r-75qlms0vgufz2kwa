#!/usr/bin/env python3
"""用法: python3 build.py [YYYY-MM-DD]  從 ../checklist_template.html 與 ../weekly_template.html 產生 index.html / weekly.html"""
import sys,re,datetime,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
date=sys.argv[1] if len(sys.argv)>1 else datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y-%m-%d')
ver=datetime.datetime.now().strftime('%Y%m%d%H%M')
HEAD='''<meta name="robots" content="noindex,nofollow">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Roby 今日檢查">
<meta name="theme-color" content="#2e7d32"><link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" href="icon-192.png">
<style>
body{max-width:820px!important;margin:0 auto!important;padding:20px!important;font-size:20px}
.nav{display:flex;gap:8px;margin:0 0 16px;position:sticky;top:0;z-index:5;background:#f6f7fb;padding:8px 0}
.nav a{flex:1;text-align:center;padding:14px;font-size:20px;border-radius:12px;text-decoration:none;color:#2e7d32;background:#fff;border:2px solid #2e7d32;font-weight:600}
.nav a.on{background:#2e7d32;color:#fff}
h1{font-size:30px!important}h2{font-size:22px!important}
label{font-size:22px!important;padding:16px 0!important;gap:18px!important}
input[type=checkbox]{width:40px!important;height:40px!important;flex:none}
textarea{font-size:20px!important}button{font-size:19px!important}
canvas{height:220px!important}#save{padding:18px!important;font-size:22px!important}
td,th{font-size:18px!important;padding:10px 6px!important}p,li{font-size:19px}
.pts button{width:60px!important;height:48px!important}.row select{font-size:18px!important;padding:8px!important}
/* 戒除拖延 */
.trow{display:flex;align-items:center;gap:10px;border-bottom:1px solid #eee}.trow label{flex:1;border:0!important}
.tbtn{flex:none;min-width:110px;min-height:56px;font-size:20px!important;border-radius:12px!important;border:2px solid #2e7d32!important;color:#2e7d32;background:#fff;font-weight:600}
.tlog{font-size:18px;color:#2e7d32;padding:0 0 12px 58px}
#tov{position:fixed;left:0;right:0;bottom:0;z-index:8;color:#fff;text-align:center;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -4px 16px #0003}
#tov.focus{background:#c62828}#tov.rest{background:#1565c0}body.timing{padding-bottom:300px!important}
.tname{font-size:22px}.tphase{font-size:22px;opacity:.9}.tclock{font-size:96px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.tbtns{display:flex;gap:16px;justify-content:center;margin-top:8px}.tbtns button{min-width:160px;min-height:64px;font-size:24px!important;border-radius:14px;border:0;background:#fff;color:#222;font-weight:600}
</style>
<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');</script>
'''
def nav(on,hero='monkey-hero.webp'):
    tabs=[('./','今日檢查'),('weekly.html','週報'),('monthly.html','月報')]
    return '<img id="paperimg" src="paper.jpg" hidden alt=""><div class="nav">'+''.join('<a href="%s" class="%s">%s</a>'%(u,'on' if i==on else '',t) for i,(u,t) in enumerate(tabs))+'</div><img class="hero" src="%s" alt="">'%hero
STORE='<script>'+open('focus.js',encoding='utf-8').read().replace('__DATE__',date)+'</script>'
def build(src,dst,on,store,hero='monkey-hero.webp',foot=True):
    h=open(src,encoding='utf-8').read()
    h=h.replace('lang="zh-Hant"','lang="zh-TW"').replace('maximum-scale=1,user-scalable=no','viewport-fit=cover')
    h=h.replace('</head>',HEAD.replace('#2e7d32','#6b7f4e')+'<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600&display=swap" rel="stylesheet"><style>'+open('theme.css',encoding='utf-8').read()+'</style></head>',1)
    h=re.sub(r'(<body[^>]*>)',lambda m:m.group(1)+nav(on,hero),h,count=1)
    if foot: h=h.replace('</body>','<img class="foot" src="cat-foot.webp" alt="讀書的小貓"><div class="footnote">慢慢來，比較快</div></body>')
    h=re.sub(r'(— )(\d{1,2}/\d{1,2}（.）前)(</span>)',r'\1<span class="due">\2</span>\3',h)  # 自動補 due span
    if store: h=h.replace('</body>',STORE+'</body>')
    open(dst,'w',encoding='utf-8').write(h)
build('../checklist_template.html','index.html',0,True)
build('../weekly_template.html','weekly.html',1,False)
build('../monthly_template.html','monthly.html',2,False,hero='cat-foot.webp',foot=False)
sw=open('sw.js',encoding='utf-8').read() if os.path.exists('sw.js') else ''
open('sw.js','w').write(re.sub(r"const V='[^']*'","const V='v%s'"%ver,sw) if sw else '')
print('built',date)
