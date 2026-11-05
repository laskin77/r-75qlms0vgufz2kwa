# 測試：2026-11-06 起形音義改用介壽國中講義（KJ-*）逐日課表；11/05 與舊版已產生的天不變
# 用法：python3 tools/test_handout.py   （起 http.server：新版 8767、舊版(HEAD~ 或 OLD_ROOT) 8768）
import json,asyncio,os,subprocess,time,sys,re,tempfile,shutil,datetime
from playwright.async_api import async_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
SCHED=json.load(open(os.environ.get('HANDOUT_SCHED',os.path.join(ROOT,'..','..','hw','handout-schedule.json')),encoding='utf-8')) if os.path.exists(os.environ.get('HANDOUT_SCHED',os.path.join(ROOT,'..','..','hw','handout-schedule.json'))) else None
def loadCR(p):
  s=open(p,encoding='utf-8').read().strip();return json.loads(s[len('window.CR_DATA='):-1])
CR=loadCR(os.path.join(ROOT,'review/questions.js'))
if SCHED is None:SCHED=CR['handout']['schedule']
ok=[]
def check(name,c):ok.append((name,bool(c)));print(('PASS ' if c else 'FAIL ')+name)
def clock(t):return "(()=>{const off=new Date('%sT20:00:00+08:00').getTime()-Date.now(),_D=Date;class D extends _D{constructor(...a){if(!a.length)super(_D.now()+off);else super(...a)}static now(){return _D.now()+off}};window.Date=D})()"%t
def seed(ls):return "(()=>{if(sessionStorage.getItem('__seeded'))return;sessionStorage.setItem('__seeded','1');localStorage.clear();const o=%s;for(const k in o)localStorage.setItem(k,o[k])})()"%json.dumps(ls)
# ---- (c) 靜態：184 題 ----
KJ=[q for q in CR['questions'] if q['id'].startswith('KJ-')]
ids=[q['id'] for q in KJ]
check('(c) KJ 題 184 題、id 不重複',len(KJ)==184 and len(set(ids))==184)
check('(c) 每題 4 選項、answer 0–3、選項不重複',all(len(q['options'])==4 and 0<=q['answer']<4 and len(set(q['options']))==4 for q in KJ))
check('(c) 不含 KJ-SZ-004',('KJ-SZ-004' not in ids))
check('(c) 課表 184 題＝題庫 KJ 題、無重複',sorted(i for v in SCHED.values() for i in v)==sorted(ids))
check('(c) 課表與內嵌課表一致',CR['handout']['schedule']==SCHED)
check('(c) lesson 無書名號、無「生命中的碎歌」',all(q['lesson'] in('愛蓮說','鳥','生命的碎珠') for q in KJ) and not any(q.get('lesson')=='生命中的碎歌' for q in CR['questions']))
check('(c) 字音→注音、其餘→形音義',all(q['topic']==('注音' if q['kind']=='字音' else '形音義') for q in KJ))
def wd(d):return datetime.date.fromisoformat(d).weekday()>=5
check('(c) 題數：平日 8、週末 20、11/21 16',all(len(v)==(16 if d=='2026-11-21' else 20 if wd(d) else 8) for d,v in SCHED.items()) and len(SCHED)==16)
OLDQ=None
async def ctxFor(br,t,ls,fx=None,mutq=None):
  c=await br.new_context(viewport={'width':820,'height':1180},locale='zh-TW',timezone_id='Asia/Taipei',service_workers='block')
  await c.add_init_script(clock(t));await c.add_init_script(seed(ls))
  async def zh(r):
    if fx and t in r.request.url:await r.fulfill(status=200,content_type='application/json',body=fx)
    else:await r.fulfill(status=404,body='nf')
  await c.route('**/data/chinese/*.json*',zh)
  if mutq:
    async def qq(r):await r.fulfill(status=200,content_type='application/javascript',body=mutq)
    await c.route('**/review/questions.js*',qq)
  return c
async def openDay(br,port,t,ls,fx=None,mutq=None,act=None):
  c=await ctxFor(br,t,ls,fx,mutq);pg=await c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  await pg.goto('http://localhost:%d/review/index.html'%port);await pg.locator('.daybar').wait_for(timeout=8000);await pg.wait_for_timeout(600)
  if act:await act(pg)
  view=await pg.locator('#view').inner_text()
  out=await pg.evaluate("(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k)}return o})()")
  await c.close();return out,view,errs
def day(ls,d):return json.loads(ls.get('roby-cr-days','{}')).get(d)
async def main():
  OLD=os.environ.get('OLD_ROOT')
  tmp=None
  if not OLD:
    tmp=tempfile.mkdtemp();subprocess.run('git -C "%s" archive %s | tar -x -C "%s"'%(ROOT,os.environ.get('OLD_REV','d41af41'),tmp),shell=True,check=True);OLD=tmp
  s1=subprocess.Popen([sys.executable,'-m','http.server','8767','-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  s2=subprocess.Popen([sys.executable,'-m','http.server','8768','-d',OLD],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
  FX5=open(os.path.join(ROOT,'data/chinese/2026-11-05.json'),encoding='utf-8').read()
  try:
   async with async_playwright() as p:
    br=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # (a) 舊版產生 11/05 並作答 2 題 → 新版載入 11/05 完全不變
    async def ans2(pg):
      await pg.click('#go');await pg.wait_for_timeout(300)
      for k in range(2):await pg.locator('.q[data-id] .opt:not([disabled])').first.click();await pg.wait_for_timeout(300)
    ls0,v0,e0=await openDay(br,8768,'2026-11-05',{},FX5,act=ans2)
    ls1,v1,e1=await openDay(br,8767,'2026-11-05',ls0,FX5)
    check('(a) 11/05 roby-cr-days 記錄完全相同',day(ls0,'2026-11-05')==day(ls1,'2026-11-05') and day(ls0,'2026-11-05') is not None)
    check('(a) 11/05 畫面文字完全相同',v0==v1)
    check('(a) 11/05 不含 KJ 題',not any(i.startswith('KJ-') for i in day(ls1,'2026-11-05')['ids']))
    check('(a) 其他 roby-* key 不變',all(ls1.get(k)==ls0.get(k) for k in ls0 if k not in('roby-cr-plan',)))
    # 11/05 新鮮產生（無舊資料）也與舊版相同（含數字標示）
    lsA,vA,_=await openDay(br,8768,'2026-11-05',{},FX5);lsB,vB,_=await openDay(br,8767,'2026-11-05',{},FX5)
    da,db=day(lsA,'2026-11-05'),day(lsB,'2026-11-05')
    check('(a) 11/05 無舊資料時新版抽題＝舊版',da['ids']==db['ids'] and vA==vB)
    check('(a) 無頁面錯誤',not e0 and not e1)
    # (b) 11/06–11/21 每天依課表（沒答錯的情況）
    ls=ls1;allok=True;bad=[];errs=[]
    for d in sorted(SCHED):
      ls,v,e=await openDay(br,8767,d,ls,FX5.replace('2026-11-05',d) if d=='2026-11-06' else None);errs+=e
      x=day(ls,d);got=x['sections'][0]['ids']
      if got!=SCHED[d]:allok=False;bad.append((d,len(got)))
    check('(b) 11/06–11/21 形音義題號＝課表、題數正確 '+str(bad),allok)
    check('(b) 無頁面錯誤',not errs)
    x6=day(ls,'2026-11-06');check('(b) 11/06（有李老師檔）版面 形音義→改錯3→閱讀→故事小測',[s.get('topic') for s in x6['sections']]==['形音義','改錯','閱讀','故事小測'] and len(x6['sections'][1]['ids'])==3)
    for d in('2026-11-22','2026-11-23','2026-11-24','2026-11-25'):
      ls,v,e=await openDay(br,8767,d,ls);x=day(ls,d)['sections'][0]['ids']
      check('(b) %s 形音義全為講義題、%d 題'%(d,len(x)),len(x)==(20 if d=='2026-11-22' else 8) and all(i.startswith('KJ-') for i in x) and len(set(x))==len(x))
    # (d) 錯題回鍋：11/06 第 1 題故意答錯 → 11/07 不出、11/08 出（擠掉 1 題新題，順延到 11/09）
    lsF={'roby-cr-days':json.dumps({'2026-11-05':day(ls1,'2026-11-05')})}
    async def wrong1(pg):
      await pg.click('#go');await pg.wait_for_timeout(300)
      q=pg.locator('.q[data-id]').first;qid=await q.get_attribute('data-id');a=[x for x in KJ if x['id']==qid][0]['answer']
      await q.locator('.opt').nth((a+1)%4).click();await pg.wait_for_timeout(300)
      await pg.evaluate("Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'))");await pg.wait_for_timeout(300)
    W=SCHED['2026-11-06'][0]
    ls,v,e=await openDay(br,8767,'2026-11-06',lsF,FX5.replace('2026-11-05','2026-11-06'),act=wrong1)
    wb=[x for x in json.loads(ls['roby-wrongbook']) if x.get('qid')==W]
    w=wb[0] if wb else {}
    q=[x for x in KJ if x['id']==W][0]
    check('(d) 錯題本：完整題幹/4 選項/正解/所選/解析/來源',bool(wb) and w['stem']==q['question'] and w['options']==q['options'] and w['answer_index']==q['answer'] and w['yours_index']==(q['answer']+1)%4 and w['explanation']==q['explanation'] and w['from']=='介壽國中講義' and w['answer'].startswith('ABCD'[q['answer']]))
    ob=json.loads(ls.get('roby-outbox','[]'));pw=[x for x in (ob[-1]['payload']['wrong'] if ob else []) if x['id']==W]
    check('(d) 回報 wrong[] 欄位齊全',bool(pw) and all(k in pw[0] for k in('id','topic','q','options','answer_index','yours_index','answer','yours','explanation','from','orig')) and pw[0]['from']=='介壽國中講義')
    ls,v,e=await openDay(br,8767,'2026-11-07',ls);x7=day(ls,'2026-11-07')['sections'][0]['ids']
    check('(d) 11/07（隔 1 天）不回鍋、照課表',x7==SCHED['2026-11-07'])
    async def right1(pg):
      await pg.click('#go');await pg.wait_for_timeout(300)
      await pg.locator('.q[data-id="%s"] .opt'%W).nth([x for x in KJ if x['id']==W][0]['answer']).click();await pg.wait_for_timeout(300)
    ls,v,e=await openDay(br,8767,'2026-11-08',ls,act=right1);x8=day(ls,'2026-11-08')['sections'][0]['ids']
    check('(d) 11/08（隔 2 天）回鍋在最前、仍 20 題、擠掉最後 1 題',x8[0]==W and len(x8)==20 and x8[1:]==SCHED['2026-11-08'][:19])
    ls,v,e=await openDay(br,8767,'2026-11-09',ls);x9=day(ls,'2026-11-09')['sections'][0]['ids']
    check('(d) 11/09 被擠掉的新題順延到最前、已答對的 W 不再出現',x9==[SCHED['2026-11-08'][19]]+SCHED['2026-11-09'][:7] and W not in x9)
    for d in sorted(SCHED):
      if d>'2026-11-09':ls,v,e=await openDay(br,8767,d,ls)
    ls,v,e=await openDay(br,8767,'2026-11-22',ls);x22=day(ls,'2026-11-22')['sections'][0]['ids']
    seen=set(i for d in sorted(SCHED) for i in day(ls,d)['sections'][0]['ids'])
    check('(d) 11/22 緩衝日吸收順延的新題（11/21 最後一題）、184 題全部出過',x22[0]==SCHED['2026-11-21'][-1] and len(seen|set(x22))==184)
    # (e) 舊版已產生 11/06（未開始）→ 新版不重抽
    lsO,_,_=await openDay(br,8768,'2026-11-06',{'roby-cr-days':json.dumps({'2026-11-05':day(ls1,'2026-11-05')})})
    lsN,_,_=await openDay(br,8767,'2026-11-06',lsO)
    check('(e) 舊版產生的 11/06 不被重抽',day(lsO,'2026-11-06')==day(lsN,'2026-11-06'))
    lsN2,_,_=await openDay(br,8767,'2026-11-06',lsO,FX5.replace('2026-11-05','2026-11-06'))
    check('(e) 舊版 11/06 之後李老師檔才到：形音義題號保留',day(lsN2,'2026-11-06')['sections'][0]['ids']==day(lsO,'2026-11-06')['sections'][0]['ids'] and day(lsN2,'2026-11-06').get('dq'))
    # fallback：題庫沒有 handout 課表 → 退回舊題庫
    C2=dict(CR);C2.pop('handout');mq='window.CR_DATA='+json.dumps(C2,ensure_ascii=False)+';'
    lsX,_,e=await openDay(br,8767,'2026-11-06',{},mutq=mq);xx=day(lsX,'2026-11-06')['sections'][0]['ids']
    check('(fallback) 無課表時用舊題庫、無錯誤',len(xx)>0 and not any(i.startswith('KJ-') for i in xx) and not e)
    await br.close()
  finally:
    s1.terminate();s2.terminate()
    if tmp:shutil.rmtree(tmp,ignore_errors=True)
  n=sum(1 for _,c in ok if c);print('%d/%d passed'%(n,len(ok)));sys.exit(0 if n==len(ok) else 1)
asyncio.run(main())
