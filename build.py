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
</style>
<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');</script>
'''
def nav(on): return '<div class="nav"><a href="./" class="%s">今日檢查</a><a href="weekly.html" class="%s">週報</a></div>'%('on' if on==0 else '','on' if on==1 else '')
STORE='''<script>
(function(){var K='roby-check-'+'%s';var els=[...document.querySelectorAll('input[type=checkbox],textarea')];
var s={};try{s=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
els.forEach(function(e,i){if(i in s){if(e.type=='checkbox')e.checked=s[i];else e.value=s[i];}
e.addEventListener(e.type=='checkbox'?'change':'input',function(){var o={};els.forEach(function(x,j){o[j]=x.type=='checkbox'?x.checked:x.value});localStorage.setItem(K,JSON.stringify(o));});});})();
</script>'''%date
def build(src,dst,on,store):
    h=open(src,encoding='utf-8').read()
    h=h.replace('lang="zh-Hant"','lang="zh-TW"').replace('maximum-scale=1,user-scalable=no','viewport-fit=cover')
    h=h.replace('</head>',HEAD+'</head>',1)
    h=re.sub(r'(<body[^>]*>)',lambda m:m.group(1)+nav(on),h,count=1)
    if store: h=h.replace('</body>',STORE+'</body>')
    open(dst,'w',encoding='utf-8').write(h)
build('../checklist_template.html','index.html',0,True)
build('../weekly_template.html','weekly.html',1,False)
sw=open('sw.js',encoding='utf-8').read() if os.path.exists('sw.js') else ''
open('sw.js','w').write(re.sub(r"const V='[^']*'","const V='v%s'"%ver,sw) if sw else '')
print('built',date)
