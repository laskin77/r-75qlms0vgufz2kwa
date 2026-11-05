# 測試：2026-11-05 起李老師題目併入「八上二段國文複習」框（11/04 不變；11/05 無檔不壞；有檔合併成一次回報）
# 用法：python3 tools/test_merge.py   （會在 repo 根目錄起 http.server:8766；11/05 題目用 11/04 檔改日期當暫時 fixture，不寫進 repo）
import json,asyncio,os,subprocess,time,sys
from playwright.async_api import async_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));B='http://localhost:8766/'
_F5=os.path.join(ROOT,'data/chinese/2026-11-05.json')
if os.path.exists(_F5):FX=open(_F5,encoding='utf-8').read()  # 真檔（只讀）
else:FX=json.load(open(os.path.join(ROOT,'data/chinese/2026-11-04.json'),encoding='utf-8'));FX['date']='2026-11-05';FX=json.dumps(FX,ensure_ascii=False)
CFG=json.load(open(os.path.join(ROOT,'data/config.json')));CFG['webhooks']={k:{'url':'https://hook.example/'+k} for k in('chinese','english','checklist')}
posts=[];have={'on':False};ok=[]
def check(name,c):ok.append((name,bool(c)));print(('PASS ' if c else 'FAIL ')+name)
def clock(t):return "(()=>{const off=new Date('%sT20:00:00+08:00').getTime()-Date.now(),_D=Date;class D extends _D{constructor(...a){if(!a.length)super(_D.now()+off);else super(...a)}static now(){return _D.now()+off}};window.Date=D})()"%t
async def ctxFor(br,t):
  c=await br.new_context(viewport={'width':820,'height':1180},locale='zh-TW',timezone_id='Asia/Taipei',service_workers='block')
  await c.add_init_script(clock(t))
  async def cfg(r):await r.fulfill(status=200,content_type='application/json',body=json.dumps(CFG))
  async def zh5(r):
    if have['on']:await r.fulfill(status=200,content_type='application/json',body=FX)
    else:await r.fulfill(status=404,body='nf')
  async def hook(r):
    if r.request.method=='OPTIONS':await r.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'});return
    posts.append({'url':r.request.url,'body':json.loads(r.request.post_data)});await r.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*'},body='ok')
  CK=open(os.path.join(ROOT,'data/checklist/2026-11-04.json'),encoding='utf-8').read() if os.path.exists(os.path.join(ROOT,'data/checklist/2026-11-04.json')) else None
  async def ck5(r):
    if CK:await r.fulfill(status=200,content_type='application/json',body=CK)
    else:await r.fulfill(status=404,body='nf')
  await c.route('**/data/checklist/2026-11-05.json*',ck5)
  await c.route('**/data/config.json*',cfg);await c.route('**/data/chinese/2026-11-05.json*',zh5);await c.route('https://hook.example/**',hook)
  return c
async def frameInfo(pg):
  fr=pg.frame_locator('#reviewFrame')
  await fr.locator('.daybar').wait_for(timeout=8000)
  return await pg.frames[1].evaluate("({secs:[...document.querySelectorAll('.sec')].map(e=>e.textContent),story:document.querySelectorAll('.story').length,locked:document.querySelectorAll('.q.locked').length,qs:document.querySelectorAll('.q[data-id]').length})")
async def main():
  srv=subprocess.Popen([sys.executable,'-m','http.server','8766','-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
  try:
   async with async_playwright() as p:
    br=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    # A) 11/04 照舊
    c=await ctxFor(br,'2026-11-04');pg=await c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(B+'?date=2026-11-04#chinese');await pg.wait_for_timeout(2500);fi=await frameInfo(pg)
    print('11/04 frame',fi)
    check('11/04 李老師分開區塊仍在',await pg.locator('.sec-gap').count()==1 and await pg.locator('h2:has-text("李老師的題目")').count()==1)
    check('11/04 框內 3 段、無故事',len(fi['secs'])==3 and fi['story']==0)
    check('11/04 無錯誤',not errs);await c.close()
    # B) 11/05 沒有檔
    c=await ctxFor(br,'2026-11-05');pg=await c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    await pg.goto(B+'?date=2026-11-05#chinese');await pg.wait_for_timeout(2500);fi=await frameInfo(pg);print('11/05 no file',fi)
    check('11/05 無檔：框照舊 3 段',len(fi['secs'])==3 and fi['story']==0)
    check('11/05 無檔：app 不顯示分開區塊',await pg.locator('.sec-gap').count()==0)
    check('11/05 無檔：無錯誤',not errs)
    # C) 11/05 有檔（同一個 localStorage：尚未作答的當天應改成合併版）
    have['on']=True;await pg.reload();await pg.wait_for_timeout(2500);fi=await frameInfo(pg);print('11/05 merged',fi)
    _d=json.loads(FX);_n=sum(len(q.get('items',[])) if q.get('type')=='group' else 1 for q in _d['questions'] if not q['id'].startswith('ST-'));check('11/05 合併：閱讀段=5 題+李老師 %d 題、無〈森林〉'%_n,any(s.startswith('閱讀理解與課文深究（%d 題）'%(5+_n)) for s in fi['secs']) and '森林' not in FX and '徐仁修' not in FX)
    check('11/05 合併：順序 形音義→改錯→閱讀(含李老師)→故事小測',[s.rsplit('（',1)[0] for s in fi['secs']]==['形音義選擇題','改錯（整段）','閱讀理解與課文深究','故事小測'])
    check('11/05 合併：故事卡＋故事小測上鎖',fi['story']==1 and fi['locked']==1)
    check('11/05 合併：app 無分開區塊',await pg.locator('.sec-gap').count()==0 and await pg.locator('h2:has-text("李老師的題目")').count()==0)
    f=pg.frames[1];await f.click('#readOK');await pg.wait_for_timeout(500);fi=await frameInfo(pg);print('after read',fi)
    check('讀完故事後解鎖',fi['locked']==0)
    ids=await f.evaluate("[...document.querySelectorAll('.q[data-id]')].map(e=>e.dataset.id)");print('order',ids)
    check('最後 3 題是故事小測、李老師題目在故事小測前',all(i.startswith('ls-ST-') for i in ids[-3:]) and any(i.startswith('ls-SE') for i in ids[:-3]))
    so=await f.evaluate("(()=>{const a=[...document.querySelectorAll('#qbox > *')];const i=a.findIndex(e=>e.classList.contains('story')),j=a.findIndex(e=>e.textContent.startsWith('閱讀理解'));return [i,j]})()");check('故事卡在閱讀段之後 '+str(so),so[0]>so[1]>=0)
    for i in range(80):
      f=pg.frames[1]
      r=await f.evaluate("""(()=>{const q=[...document.querySelectorAll('.q[data-id]')].find(e=>!e.classList.contains('ok')&&!e.classList.contains('ng')&&(e.querySelector('.opt:not([disabled])')||e.querySelector('.pconf')||e.querySelector('.okbtn')));if(!q)return 'none';
        const o=q.querySelectorAll('.opt:not([disabled])');if(o.length){o[(q.dataset.id.length)%o.length].click();return 'opt'}
        const pc=q.querySelector('.pconf');if(pc){const c=q.querySelector('.ch');if(c)c.click();setTimeout(()=>{const b=q.isConnected?q.querySelector('.pconf'):document.querySelector('.q[data-id="'+q.dataset.id+'"] .pconf');b&&b.click()},50);return 'pass'}
        const inp=q.querySelector('input.fill');inp.value='x';inp.dispatchEvent(new Event('input'));q.querySelector('.okbtn').click();return 'fill'})()""")
      if r=='none':break
      await pg.wait_for_timeout(250)
    await pg.wait_for_timeout(3000)
    days=await pg.evaluate("JSON.parse(localStorage['roby-cr-days'])['2026-11-05']");print('score',days.get('score'),'first',bool(days.get('first')))
    check('合併日完成並計分',days.get('first') is not None and isinstance(days.get('score'),int))
    ob=await pg.evaluate("JSON.parse(localStorage['roby-outbox']||'[]')");print('outbox left',[(x['dedupe'],x.get('status')) for x in ob])
    zh=[x['body'] for x in posts if x['url'].endswith('/chinese')]
    check('沒有第二份 chinese-2026-11-05 回報',all(b.get('source')=='review' for b in zh) and not any(x['dedupe']=='chinese-2026-11-05' for x in ob))
    last=[b for b in zh if b.get('status')=='complete']
    check('有 complete 回報',bool(last))
    if last:
      P=last[-1];open('/tmp/merged_payload.json','w').write(json.dumps(P,ensure_ascii=False,indent=1))
      need=['source','subject','date','score','first_correct','first_wrong','total','wrong','status','merged','parts','after_correction','answers','submitted_at','sections']
      check('payload 欄位齊全 '+str([k for k in need if k not in P]),all(k in P for k in need) and P['merged'] is True)
      check('parts.review/daily',set(P['parts'])=={'review','daily'} and isinstance(P['parts']['daily']['wrong'],list))
      check('sections 順序與配分',[s['name'] for s in P['sections']]==['形音義選擇題','改錯（整段）','閱讀理解與課文深究','故事小測'] and sum(s['max'] for s in P['sections'])==100)
      print('sections',json.dumps(P['sections'],ensure_ascii=False))
      ch=[w for w in P['wrong'] if 'options' in w];check('wrong[] 有完整題幹/選項/索引/from',ch and all(len(w['q'])>0 and 'answer_index' in w and 'yours_index' in w and w.get('from') in('daily','review') for w in P['wrong'] if 'options' in w) and any(w.get('from')=='daily' and w['section']=='閱讀理解與課文深究' for w in P['wrong']))
      check('wrong 為物件且有 id/section',all(isinstance(w,dict) and 'id' in w and 'section' in w for w in P['wrong']))
      print('summary',json.dumps({k:P[k] for k in('score','first_correct','first_wrong','total','parts')},ensure_ascii=False))
    wb=await pg.evaluate("JSON.parse(localStorage['roby-wrongbook']||'[]').filter(x=>x.date==='2026-11-05').map(x=>x.id)");print('wrongbook 11/05',len(wb),wb[:3])
    await pg.goto(B+'?date=2026-11-05#check');await pg.wait_for_timeout(2000);rows=await pg.locator('.cr-merge,.cr-row').all_inner_texts();print('check page cr rows',rows,await pg.locator('label:has(input[data-subj=chinese])').all_inner_texts());check('今日檢查顯示合併分數一次',any(('複習 '+str(days.get('score'))+' 分') in r or ('小測驗 '+str(days.get('score'))+' 分') in r for r in rows) and not any('小測驗 —' in t for t in await pg.locator('label:has(input[data-subj=chinese])').all_inner_texts()))
    await pg.evaluate("(()=>{const a=JSON.parse(localStorage['roby-wrongbook']||'[]');a.push({key:'chinese|2026-10-01|old',subject:'chinese',date:'2026-10-01',id:'old',question:'舊格式題目',answer:'A. x',yours:'B. y',fixed:false});localStorage['roby-wrongbook']=JSON.stringify(a)})()")
    await pg.goto(B+'?date=2026-11-05#wrong');await pg.wait_for_timeout(1500)
    n_wb=await pg.locator('.wb').count();n_o=await pg.locator('.wb .wbo').count();n_p=await pg.locator('.wb details.wbpass').count();print('wrongbook rendered',n_wb,'with options',n_o,'with passage',n_p)
    check('錯題本顯示選項與文章、舊格式不壞',n_wb>=len(wb)+1 and n_o>0 and n_p>0 and await pg.locator('.wb:has-text("舊格式題目")').count()==1)
    check('全程無錯誤 '+str(errs),not errs);await br.close()
  finally:srv.terminate()
  print('RESULT',sum(1 for _,c in ok if c),'/',len(ok))
asyncio.run(main())
