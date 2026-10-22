#!/usr/bin/env python3
"""檢查 data/ 下所有 JSON。用法：python3 tools/validate.py [檔案或資料夾 ...]（預設整個 data/）。有錯誤時結束碼 1。"""
import json,re,sys,os,glob
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
errs=[];warns=[]
def E(f,m):errs.append(f'❌ {f}: {m}')
def W(f,m):warns.append(f'⚠️  {f}: {m}')
DATE=re.compile(r'^\d{4}-\d{2}-\d{2}$')
def ans_index(a,opts):
    if isinstance(a,list):a=a[0] if a else None
    if isinstance(a,bool):return -1
    if isinstance(a,int):return a if 0<=a<len(opts) else -1
    s=str(a if a is not None else '').strip()
    if s.isdigit() and int(s)<len(opts):return int(s)
    if re.fullmatch(r'[A-Da-d]',s):i=ord(s.upper())-65;return i if i<len(opts) else -1
    n=lambda x:re.sub(r'\s+','',str(x)).lower()
    for i,o in enumerate(opts):
        if n(o)==n(s):return i
    return -1
def check_choice(f,q,where):
    o=q.get('options')
    if not isinstance(o,list) or len(o)<2:E(f,f'{where} options 至少 2 個');return
    if ans_index(q.get('answer'),o)<0:E(f,f'{where} answer {q.get("answer")!r} 對不到任何選項（可用 0 起算的索引、A–D、或選項原文）')
def check_q(f,q,where,ids):
    if not isinstance(q,dict):E(f,f'{where} 不是物件');return
    i=q.get('id')
    if i:
        if i in ids:E(f,f'{where} id 重複：{i}')
        ids.add(i)
    else:W(f,f'{where} 沒有 id，會自動編號（建議填 q1、q2…）')
    t=q.get('type') or ('choice' if q.get('options') else 'fill')
    if t=='group':
        subs=q.get('items') or q.get('questions')
        if not subs:E(f,f'{where} group 需要 items[]')
        if not (q.get('passage') or q.get('text')):W(f,f'{where} group 沒有 passage')
        for j,s in enumerate(subs or []):check_q(f,s,f'{where}.items[{j}]',ids)
        return
    if not (q.get('question') or q.get('text')):E(f,f'{where} 缺 question')
    if t=='choice':check_choice(f,q,where)
    elif t=='fill':
        a=q.get('answer');a=a if isinstance(a,list) else [a]
        if not a or any(x in (None,'') for x in a):E(f,f'{where} fill 的 answer 要是可接受答案的陣列，例如 ["海棠","海棠花"]')
    else:E(f,f'{where} type 只能是 choice / fill / group')
    if not q.get('explanation'):W(f,f'{where} 沒有 explanation（送出後會沒有解析）')
def date_ok(f,o,name):
    d=o.get('date')
    if not d or not DATE.match(str(d)):E(f,'date 必須是 YYYY-MM-DD');return
    if name and d!=name:E(f,f'date {d} 和檔名 {name} 不一致')
def dialog(f,o):
    d=o.get('dialog')
    if d is None:return
    if not isinstance(d,dict):E(f,'dialog 必須是物件');return
    for k in ('correct','wrong'):
        if k in d and not isinstance(d[k],(list,str)):E(f,f'dialog.{k} 應為字串陣列')
def v_checklist(f,o,name):
    date_ok(f,o,name)
    for k in ('warning','plan','daily','weekTodo'):
        if k in o and not isinstance(o[k],list):E(f,f'{k} 必須是陣列')
    for i,p in enumerate(o.get('plan',[])):
        if not (isinstance(p,str) or (isinstance(p,dict) and p.get('text'))):E(f,f'plan[{i}] 需要 text')
    for i,d in enumerate(o.get('daily',[])):
        if isinstance(d,str):continue
        if not isinstance(d,dict):E(f,f'daily[{i}] 格式錯誤');continue
        if 'pair' in d:
            if not (isinstance(d['pair'],list) and len(d['pair'])==2):E(f,f'daily[{i}].pair 要兩個字串')
        elif not d.get('text'):E(f,f'daily[{i}] 需要 text')
        if d.get('subject') and d['subject'] not in ('chinese','english'):E(f,f'daily[{i}].subject 只能是 chinese / english')
    for i,t in enumerate(o.get('weekTodo',[])):
        if not isinstance(t,dict) or not t.get('text'):E(f,f'weekTodo[{i}] 需要 text')
        elif not t.get('due'):W(f,f'weekTodo[{i}] 沒有 due')
    if 'note' in o and not isinstance(o['note'],str):E(f,'note 必須是字串')
def v_generic(f,o,name,subj):
    date_ok(f,o,name)
    if o.get('subject') not in (None,subj):E(f,f'subject 應為 {subj}')
    if not o.get('title'):W(f,'沒有 title')
    ids=set()
    for i,p in enumerate(o.get('passages',[])):
        if not isinstance(p,dict) or not p.get('text'):E(f,f'passages[{i}] 需要 text')
    if not o.get('questions'):E(f,'questions[] 不可為空')
    for i,q in enumerate(o.get('questions',[])):check_q(f,q,f'questions[{i}]',ids)
    L=o.get('learn')
    if L is not None and not isinstance(L,dict):E(f,'learn 必須是物件')
    dialog(f,o)
def v_english(f,o,name):
    if not (o.get('shadow') or o.get('uoe') or o.get('vocab')):return v_generic(f,o,name,'english')
    date_ok(f,o,name)
    if not o.get('topic'):W(f,'沒有 topic')
    s=o.get('shadow')
    if s:
        if not re.fullmatch(r'[\w-]{11}',str(s.get('youtubeId',''))):E(f,'shadow.youtubeId 應為 11 碼 YouTube ID')
        for i,c in enumerate(s.get('chunks',[])):
            try:
                if not float(c['end'])>float(c['start']):E(f,f'shadow.chunks[{i}] end 要大於 start')
            except Exception:E(f,f'shadow.chunks[{i}] 需要數字 start/end（秒）')
            if not c.get('text'):W(f,f'shadow.chunks[{i}] 沒有 text')
        if not s.get('chunks') and (s.get('start') is None or s.get('end') is None):E(f,'shadow 需要 chunks[] 或 start/end')
        r=s.get('respond') or {}
        if not r.get('prompt_en'):W(f,'shadow.respond.prompt_en 空白')
    v=o.get('vocab',[])
    if len(v)!=5:W(f,f'vocab 有 {len(v)} 個（約定 5 個）')
    for i,x in enumerate(v):
        if not x.get('word') or not x.get('zh'):E(f,f'vocab[{i}] 需要 word 與 zh')
    g=o.get('grammar')
    if g:
        if not g.get('explain'):W(f,'grammar.explain 空白')
        pr=g.get('practice');pr=pr if isinstance(pr,list) else ([pr] if pr else [])
        for i,p in enumerate(pr):check_choice(f,p,f'grammar.practice[{i}]')
    u=o.get('uoe')
    if u:
        gaps=u.get('gaps',[]);marks=re.findall(r'_{2,}\s*(\d+)\s*_{2,}',u.get('passage',''))
        if len(gaps)!=4:W(f,f'uoe.gaps 有 {len(gaps)} 個（約定 4 個）')
        if len(marks)!=len(gaps):E(f,f'uoe.passage 有 {len(marks)} 個 ___n___，但 gaps 有 {len(gaps)} 個')
        for i,gp in enumerate(gaps):
            if gp.get('id')!=f'u{i+1}':E(f,f'uoe.gaps[{i}].id 應為 u{i+1}')
            check_choice(f,gp,f'uoe.gaps[{i}]')
    q=o.get('quiz',[])
    if len(q)!=6:W(f,f'quiz 有 {len(q)} 題（約定 6 題）')
    for i,x in enumerate(q):
        if x.get('id')!=f'q{i+1}':E(f,f'quiz[{i}].id 應為 q{i+1}')
        if not x.get('question'):E(f,f'quiz[{i}] 缺 question')
        check_choice(f,x,f'quiz[{i}]')
    dialog(f,o)
def v_weekly(f,o,name):
    ws=o.get('week_start',name)
    if not DATE.match(str(ws)):E(f,'week_start 必須是 YYYY-MM-DD');return
    import datetime
    if datetime.date.fromisoformat(ws).weekday()!=0:E(f,'檔名/week_start 必須是週一')
    if name and ws!=name:E(f,'week_start 與檔名不一致')
    if not isinstance(o.get('base',0),(int,float)):E(f,'base（累計點數）必須是數字')
def v_monthly(f,o,name):
    if not re.fullmatch(r'\d{4}-\d{2}',name or ''):E(f,'檔名必須是 YYYY-MM.json')
    elif (o.get('year'),o.get('month'))!=(int(name[:4]),int(name[5:])):E(f,'year/month 與檔名不一致')
    for k in ('plan','daily'):
        if not isinstance(o.get(k),dict):E(f,f'{k} 必須是物件')
def v_config(f,o,name):
    w=o.get('webhooks')
    if not isinstance(w,dict):E(f,'需要 webhooks 物件');return
    for k in ('chinese','english','checklist'):
        x=w.get(k)
        if not isinstance(x,dict) or 'url' not in x or 'key' not in x:E(f,f'webhooks.{k} 需要 url 與 key')
        elif not x['url']:W(f,f'webhooks.{k}.url 尚未填（結果會先排隊，等填好後自動補送）')
        elif not str(x['url']).startswith('https://'):E(f,f'webhooks.{k}.url 必須是 https://')
def v_chars(f,o):
    c=o.get('characters')
    if c is None:return
    for k in ('chinese','english','monkey','cat'):
        x=c.get(k)
        if not isinstance(x,dict) or not x.get('name') or not x.get('avatar'):E(f,f'characters.{k} 需要 name 與 avatar');continue
        if not os.path.exists(os.path.join(ROOT,x['avatar'])):E(f,f'characters.{k}.avatar 找不到檔案 {x["avatar"]}')
V={'checklist':v_checklist,'chinese':lambda f,o,n:v_generic(f,o,n,'chinese'),'english':v_english,'weekly':v_weekly,'monthly':v_monthly}
def one(path):
    rel=os.path.relpath(path,ROOT);parts=rel.replace('\\','/').split('/');name=os.path.basename(path)[:-5]
    try:o=json.load(open(path,encoding='utf-8'))
    except Exception as e:E(rel,f'JSON 格式錯誤：{e}');return
    if not isinstance(o,dict):E(rel,'最外層必須是物件');return
    if parts[-1]=='config.json':v_chars(rel,o);return v_config(rel,o,name)
    kind=parts[-2] if len(parts)>=2 else ''
    if kind not in V:W(rel,'不認得的資料夾，略過');return
    if kind in('checklist','chinese','english') and not DATE.match(name):E(rel,'檔名必須是 YYYY-MM-DD.json')
    V[kind](rel,o,name)
targets=sys.argv[1:] or [os.path.join(ROOT,'data')]
files=[]
for t in targets:
    files+= sorted(glob.glob(os.path.join(t,'**','*.json'),recursive=True)) if os.path.isdir(t) else [t]
for p in files:one(p)
for m in warns:print(m)
for m in errs:print(m)
print(f'\n檢查 {len(files)} 個檔案：{len(errs)} 個錯誤、{len(warns)} 個提醒')
sys.exit(1 if errs else 0)
