# 測試 weekTodo.days：7 日勾選列渲染、跨 reload／同週不同 DATE 持久化、舊項索引不受影響
# 用法：python3 tools/test_weekdays.py
import json,asyncio,os,subprocess,time,sys,copy
from playwright.async_api import async_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));B='http://localhost:8767/'
PORT=8767
ok=[]
def check(name,c):ok.append((name,bool(c)));print(('PASS ' if c else 'FAIL ')+name+( '' if c else ' ←'))

# Fixture checklist: 2 legacy weekTodo + 1 days item
CK={
 "date":"2026-11-05",
 "warning":[],
 "plan":[{"text":"計畫 A","timer":False}],
 "daily":[{"pair":["聯絡簿已簽","聯絡簿未帶"]},{"text":"國文小測驗","subject":"chinese"}],
 "weekTodo":[
  {"text":"舊功課一","due":"11/6（五）前"},
  {"text":"舊功課二","due":"11/7（六）前"},
  {"text":"國文家教功課：每天閱讀測驗","due":"11/7（六）前","days":7}
 ],
 "note":"test"
}
CK_LEGACY=copy.deepcopy(CK);CK_LEGACY['weekTodo']=[
  {"text":"舊功課一","due":"11/6（五）前"},
  {"text":"舊功課二","due":"11/7（六）前"},
  {"text":"國文家教功課","due":"11/7（六）前"}  # no days
]
CFG=json.load(open(os.path.join(ROOT,'data/config.json')));CFG['webhooks']={}

def clock(t):
  return "(()=>{const off=new Date('%sT12:00:00+08:00').getTime()-Date.now(),_D=Date;class D extends _D{constructor(...a){if(!a.length)super(_D.now()+off);else super(...a)}static now(){return _D.now()+off}};window.Date=D})()"%t

async def main():
  srv=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(0.8)
  try:
   async with async_playwright() as p:
    br=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=await br.new_context(viewport={'width':820,'height':1180},locale='zh-TW',timezone_id='Asia/Taipei',service_workers='block')
    await ctx.add_init_script(clock('2026-11-05'))
    body={'ck':json.dumps(CK,ensure_ascii=False)}
    async def cfg(r):await r.fulfill(status=200,content_type='application/json',body=json.dumps(CFG))
    async def ck(r):await r.fulfill(status=200,content_type='application/json',body=body['ck'])
    await ctx.route('**/data/config.json*',cfg)
    await ctx.route('**/data/checklist/2026-11-05.json*',ck)
    await ctx.route('**/data/checklist/2026-11-06.json*',ck)
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))

    # --- render ---
    await pg.goto(B+'?date=2026-11-05#check');await pg.wait_for_timeout(1800)
    n_days=await pg.locator('input.wd-day').count()
    n_items=await pg.locator('.wd-item').count()
    prog=await pg.locator('.wd-prog').inner_text()
    today=await pg.locator('label.wd-today').count()
    check('render: 1 wd-item + 7 day checkboxes', n_items==1 and n_days==7)
    check('render: progress 本週 0/7 天', '0/7' in prog)
    check('render: today highlighted (四→index 3)', today==1)
    labels=await pg.locator('.wd-days label.wd-day span').all_inner_texts()
    check('render: default labels 一二三四五六日', labels==['一','二','三','四','五','六','日'])

    # legacy checkboxes still present (plan1 + pair2 + daily1 + weekTodo2 + confirm1 = 7; textarea separate)
    # Count non-wd checkboxes in page (excl pconfirm)
    legacy_cbs=await pg.evaluate("""()=>[...document.querySelectorAll('#page input[type=checkbox]')].filter(e=>!e.classList.contains('wd-day')&&!e.classList.contains('cr-auto')&&e.id!=='pconfirm').length""")
    check('legacy: non-wd checkboxes count (plan+pair+daily+2 weekTodo+confirm)=7', legacy_cbs==7)

    # tick Mon+Wed+Thu (0,2,3)
    for i in (0,2,3):
      await pg.locator('input.wd-day').nth(i).check()
    await pg.wait_for_timeout(200)
    prog=await pg.locator('.wd-prog').inner_text()
    check('tick: progress 本週 3/7 天', '3/7' in prog)
    store=await pg.evaluate("()=>JSON.parse(localStorage.getItem('roby-weekdays-2026-11-02')||'{}')")
    check('tick: stored under monday key chinese_tutor', store.get('chinese_tutor')==[True,False,True,True,False,False,False])

    # mark a legacy weekTodo and set note — ensure index not shifted by wd-days
    await pg.locator('label:has-text("舊功課一") input').check()
    await pg.fill('textarea', '備註保留')
    await pg.wait_for_timeout(150)
    daily=await pg.evaluate("()=>JSON.parse(localStorage.getItem('roby-check-2026-11-05')||'{}')")
    # Find which index is 舊功課一: plan0, pair1, pair2, daily3, week0=4, week1=5, note=6, confirm=7
    check('index: 舊功課一 checked at index 4 (not shifted by day ticks)', daily.get('4') is True)
    check('index: note still at index 6', daily.get('6')=='備註保留')

    # reload same date
    await pg.reload();await pg.wait_for_timeout(1800)
    ticks=await pg.evaluate("()=>[...document.querySelectorAll('input.wd-day')].map(e=>e.checked)")
    check('reload: day ticks restored', ticks==[True,False,True,True,False,False,False])
    check('reload: progress still 3/7', '3/7' in await pg.locator('.wd-prog').inner_text())
    check('reload: legacy 舊功課一 still checked', await pg.locator('label:has-text("舊功課一") input').is_checked())
    check('reload: note restored', await pg.input_value('textarea')=='備註保留')

    # same week different DATE (Friday 11/6) — weekdays persist; daily check is separate
    await pg.goto(B+'?date=2026-11-06#check');await pg.wait_for_timeout(1800)
    # re-route uses same CK body (date field inside may say 11-05 but app uses URL date for storage keys)
    ticks=await pg.evaluate("()=>[...document.querySelectorAll('input.wd-day')].map(e=>e.checked)")
    check('cross-day same week: ticks persist', ticks==[True,False,True,True,False,False,False])
    today_lab=await pg.locator('label.wd-today span').inner_text()
    check('cross-day: today highlight is 五', today_lab=='五')
    # daily check for 11-06 should be empty (new day) — 舊功課一 not checked
    check('cross-day: daily legacy unchecked on new DATE', not await pg.locator('label:has-text("舊功課一") input').is_checked())

    # export payload includes weekdays
    rec=await pg.evaluate("""()=>{
      // trigger buildRec via export path if available: call parent confirm machinery lightly
      const k=[...document.querySelectorAll('input.wd-day')];
      const ticks=k.map(e=>e.checked);
      const st=JSON.parse(localStorage.getItem('roby-weekdays-2026-11-02')||'{}');
      return {ticks,st,has:!!st.chinese_tutor};
    }""")
    check('storage shape for export', rec['has'] and rec['st']['chinese_tutor'].count(True)==3)

    # buildRec weekdays field: simulate by reading after checking confirm flow helpers
    # Fill confirm and use evaluate to call internal — instead click export if unlocked
    # Directly inspect by evaluating a synthetic daily build through UI export button after setting note
    payload=await pg.evaluate("""()=>{
      const root=document.getElementById('page');
      const items=[...root.querySelectorAll('.wd-item')];
      const out={};
      items.forEach(box=>{const id=box.dataset.wdId;const ticks=[...box.querySelectorAll('input.wd-day')].map(c=>!!c.checked);out[id]={ticks,count:ticks.filter(Boolean).length}});
      return out;
    }""")
    check('payload weekdays shape', payload.get('chinese_tutor',{}).get('count')==3 and len(payload['chinese_tutor']['ticks'])==7)

    # all 7 → done style
    for i in range(7):
      cb=pg.locator('input.wd-day').nth(i)
      if not await cb.is_checked():await cb.check()
    await pg.wait_for_timeout(200)
    check('done style when 7/7', await pg.locator('.wd-item.wd-done').count()==1 and '7/7' in await pg.locator('.wd-prog').inner_text())

    # weekly page line
    await pg.get_by_role('button', name='週報').click();await pg.wait_for_timeout(1000)
    body_txt=await pg.locator('#page').inner_text()
    check('weekly page shows 國文家教功課閱讀測驗 7/7 天', '國文家教功課閱讀測驗 7/7 天' in body_txt)

    # legacy rendering unchanged when no days
    body['ck']=json.dumps(CK_LEGACY,ensure_ascii=False)
    await pg.goto(B+'?date=2026-11-05#check');await pg.wait_for_timeout(1800)
    check('legacy: no wd-item when days absent', await pg.locator('.wd-item').count()==0)
    check('legacy: 國文家教功課 is normal checkbox', await pg.locator('label:has-text("國文家教功課") input').count()==1)
    check('no page errors', not errs)
    if errs:print('ERRS',errs)
    await br.close()
  finally:
    srv.terminate()
  bad=[n for n,c in ok if not c]
  print('RESULT',sum(1 for _,c in ok if c),'/',len(ok),'passed')
  if bad:print('FAILED:',bad);sys.exit(1)

asyncio.run(main())
