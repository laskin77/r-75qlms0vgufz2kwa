#!/usr/bin/env python3
"""v2 每日流程：index.html 已固定，不再產生 HTML。
用法：
  python3 build.py [YYYY-MM-DD]          檢查資料（tools/validate.py）並更新 sw.js 版本號
  python3 build.py new YYYY-MM-DD         以前一份 checklist 為底，產生 data/checklist/YYYY-MM-DD.json 草稿（plan 清空、weekTodo 保留）
每日排程只寫 data/checklist/YYYY-MM-DD.json（週日加 data/weekly/<週一>.json，每月 1 日加 data/monthly/YYYY-MM.json），
再執行本程式、commit、push。舊版產生 HTML 的程式在 build_legacy.py（產生 legacy.html）。"""
import sys,os,re,json,glob,datetime,subprocess
os.chdir(os.path.dirname(os.path.abspath(__file__)))
TPE=datetime.timezone(datetime.timedelta(hours=8))
a=sys.argv[1:]
if a and a[0]=='new':
    d=a[1] if len(a)>1 else datetime.datetime.now(TPE).strftime('%Y-%m-%d')
    prev=sorted(p for p in glob.glob('data/checklist/*.json') if os.path.basename(p)[:-5]<d)
    o=json.load(open(prev[-1],encoding='utf-8')) if prev else {"warning":[],"plan":[],"daily":[{"pair":["聯絡簿已簽","聯絡簿未帶"]},{"text":"英文大師","subject":"english","label":"小測驗"}],"weekTodo":[],"note":""}
    o['date']=d;o['plan']=[];o['warning']=[]
    dst=f'data/checklist/{d}.json'
    if os.path.exists(dst):sys.exit(f'{dst} 已存在')
    open(dst,'w',encoding='utf-8').write(json.dumps(o,ensure_ascii=False,indent=1)+'\n');print('寫入',dst,'（請填 plan / warning，並刪掉已完成的 weekTodo）');sys.exit(0)
r=subprocess.run([sys.executable,'tools/validate.py'])
if r.returncode:sys.exit('資料有錯，請修正後再 commit')
ver=datetime.datetime.now(TPE).strftime('%Y%m%d%H%M')
sw=open('sw.js',encoding='utf-8').read();open('sw.js','w',encoding='utf-8').write(re.sub(r"const V='[^']*'","const V='v%s'"%ver,sw))
print('ok',ver)
