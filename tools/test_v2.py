import json,asyncio,base64
from playwright.async_api import async_playwright
B='http://localhost:8765/v2/'
CFG0=__import__("json").load(open(__import__("os").path.join(__import__("os").path.dirname(__file__),"..","data","config.json")));CFG={"characters":CFG0["characters"],"webhooks":{k:{"url":"https://hook.example/"+k,"headers":{"Authorization":"Authorization: Bearer T-"+k,"X-Extra":"1"}} for k in("chinese","english","checklist")}}
posts=[];fail={'on':True}
async def main():
  async with async_playwright() as p:
    br=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=await br.new_context(viewport={'width':820,'height':1180},device_scale_factor=1,has_touch=True,locale='zh-TW',timezone_id='Asia/Taipei')
    async def cfg(r):await r.fulfill(status=200,content_type='application/json',body=json.dumps(CFG))
    async def hook(r):
      if fail['on']:await r.abort();return
      if r.request.method=='OPTIONS':await r.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST'});return
      posts.append({'url':r.request.url,'h':(r.request.headers.get('authorization'),r.request.headers.get('x-extra')),'body':json.loads(r.request.post_data)})
      await r.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*'},body='ok')
    FX=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'test_chinese_fixture.json'),encoding='utf-8').read()
    async def zh(r):await r.fulfill(status=200,content_type='application/json',body=FX)
    await ctx.route('**/data/chinese/2026-10-22.json*',zh)
    await ctx.route('**/data/config.json*',cfg);await ctx.route('https://hook.example/**',hook)
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    await pg.goto(B+'#check');await pg.wait_for_timeout(1500)
    await pg.screenshot(path='/workspace/roby/v2_check.png',full_page=True)
    # english flow
    await pg.click('#nav button:nth-child(3)');await pg.wait_for_timeout(800)
    lock=await pg.locator('.locked').count();print('locked cards before learn',lock)
    await pg.screenshot(path='/workspace/roby/v2_english_learn.png',full_page=True)
    await pg.fill('textarea','I usually put off my math homework.');await pg.click('text=跟讀完成');await pg.wait_for_timeout(300)
    await pg.click('text=單字看完了');await pg.wait_for_timeout(300)
    # grammar practice: answer wrong then right
    await pg.locator('.card:has-text("文法") .opt').nth(1).click();await pg.click('.card:has-text("文法") .go');await pg.wait_for_timeout(200)
    await pg.locator('.card:has-text("文法") .opt').nth(0).click();await pg.click('.card:has-text("文法") .go');await pg.wait_for_timeout(300)
    # uoe: answers u1 wrong(1), others right
    u=pg.locator('.card:has-text("克漏字") .q')
    for i,a in enumerate([1,0,1,0]):await u.nth(i).locator('.opt').nth(a).click()
    await pg.click('.card:has-text("克漏字") .go');await pg.wait_for_timeout(300)
    print('uoe tally',await pg.locator('.card:has-text("克漏字") .tally').inner_text())
    await u.nth(0).locator('.opt').nth(0).click();await pg.click('.card:has-text("克漏字") .go');await pg.wait_for_timeout(300)
    print('quiz locked?',await pg.locator('.locked').count())
    q=pg.locator('.card:has-text("小測驗 Quiz") .q')
    for i,a in enumerate([0,0,0,2,0,0]):await q.nth(i).locator('.opt').nth(a).click()  # q2 wrong
    await pg.click('.card:has-text("小測驗 Quiz") .go');await pg.wait_for_timeout(300)
    pos=await pg.evaluate("(()=>{var b=document.querySelector('.buddy');var q=b.nextElementSibling;return [b.classList.contains('inline'),q&&q.dataset.id,b.querySelector('.bubble').textContent]})()");print('buddy follows ->',pos)
    await pg.screenshot(path='/workspace/roby/v2_follow.png')
    print('quiz tally',await pg.locator('.card:has-text("小測驗 Quiz") .tally').inner_text())
    await pg.screenshot(path='/workspace/roby/v2_english_correct.png',full_page=True)
    await q.nth(1).locator('.opt').nth(1).click();await pg.click('.card:has-text("小測驗 Quiz") .go');await pg.wait_for_timeout(800)
    ob=await pg.evaluate('__roby.outbox()');print('queued while hook fails:',[(x['kind']) for x in ob])
    # chinese
    await pg.click('#nav button:nth-child(2)');await pg.wait_for_timeout(500);await pg.click('text=我讀完了');await pg.wait_for_timeout(300)
    cq=pg.locator('.q')
    await cq.nth(0).locator('.opt').nth(0).click()  # wrong
    await cq.nth(1).locator('input').fill('海棠花');await cq.nth(2).locator('.opt').nth(1).click();await cq.nth(3).locator('.opt').nth(0).click()
    await pg.click('.go');await pg.wait_for_timeout(300);print('zh tally',await pg.locator('.tally').inner_text())
    await pg.screenshot(path='/workspace/roby/v2_chinese.png',full_page=True)
    await cq.nth(0).locator('.opt').nth(1).click();await pg.click('.go');await pg.wait_for_timeout(500)
    # wrongbook
    await pg.click('#nav button:nth-child(4)');await pg.wait_for_timeout(400);print('wrongbook items',await pg.locator('.wb').count())
    await pg.screenshot(path='/workspace/roby/v2_wrongbook.png',full_page=True)
    # checklist: auto-check english + confirm + sign
    await pg.click('#nav button:nth-child(1)');await pg.wait_for_timeout(500)
    print('eng checked',await pg.locator('input[data-subj=english]').is_checked(),await pg.locator('.score').first.inner_text(),await pg.locator('.score').first.get_attribute('class'))
    await pg.click('text=我已經自己檢查完今天的項目');await pg.wait_for_timeout(300)
    bb=await pg.locator('#sig').bounding_box();await pg.mouse.move(bb['x']+30,bb['y']+40);await pg.mouse.down();await pg.mouse.move(bb['x']+200,bb['y']+100,steps=8);await pg.mouse.move(bb['x']+320,bb['y']+50,steps=8);await pg.mouse.up();await pg.wait_for_timeout(2000)
    ob=await pg.evaluate('__roby.outbox()');print('queue now',[x['kind'] for x in ob])
    # go online -> reload triggers flush
    fail['on']=False;await pg.reload();await pg.wait_for_timeout(2500)
    print('posted',[(x['url'].split('/')[-1],x['h']) for x in posts],'left',len(await pg.evaluate('__roby.outbox()')))
    for x in posts:
      if x['url'].endswith('english'):print(json.dumps({k:x['body'][k] for k in('subject','date','quiz','uoe','score','wrong','shadow_response','completed_at')},ensure_ascii=False))
      if x['url'].endswith('chinese'):print(json.dumps({k:x['body'][k] for k in('score','first_correct','first_wrong','wrong')},ensure_ascii=False))
      if x['url'].endswith('checklist'):print(json.dumps({k:x['body'][k] for k in('by','done','total','confirmed','signed','contact_book')},ensure_ascii=False))
    # all done celebration: check every remaining
    await pg.evaluate('document.querySelectorAll("input[type=checkbox]").forEach(e=>{if(!e.checked&&!e.closest("label.alt"))e.click()})')
    await pg.wait_for_timeout(400);print('celebrate',await pg.locator('#done').count())
    await pg.screenshot(path='/workspace/roby/v2_done.png');await pg.locator('#done').click()
    # timer
    await pg.locator('.tbtn').first.click();await pg.wait_for_timeout(1200);print('timer overlay',await pg.locator('#tov').is_visible());await pg.click('#tov .tx');await pg.wait_for_timeout(300);print('log',await pg.locator('.tlog').first.inner_text())
    # PNG save
    await pg.click('#save');await pg.wait_for_selector('#pngview',timeout=15000);u=await pg.evaluate('__lastPNG')
    open('/workspace/roby/v2_saved.png','wb').write(base64.b64decode(u.split(',')[1]));print('png bytes',len(u))
    await pg.click('#pngview button')
    await pg.click('#nav button:nth-child(5)');await pg.wait_for_timeout(600);await pg.locator('.add').first.click();await pg.locator('.pts button').nth(1).click();print('weekly tot',await pg.locator('#tot').inner_text())
    await pg.screenshot(path='/workspace/roby/v2_weekly.png',full_page=True)
    await pg.click('#nav button:nth-child(6)');await pg.wait_for_timeout(600);await pg.screenshot(path='/workspace/roby/v2_monthly.png',full_page=True)
    p2=await ctx.new_page();await p2.goto(B+'?date=2026-12-25#chinese');await p2.wait_for_timeout(1000);print('missing:',await p2.locator('.empty').inner_text())
    print('ansIndex',await pg.evaluate('[__roby.ansIndex("B",["a","b"]),__roby.ansIndex("2",["a","b","c"]),__roby.ansIndex("(C) c",["a","b","c"]),__roby.ansIndex(" b ",["a","b"])]'))
    CFG["webhooks"]["chinese"]={"url":"https://nocors.example/hook","headers":{"Authorization":"Bearer NC"}};nc=[]
    async def nocors(r):
      if r.request.method=='OPTIONS' or 'json' in (r.request.headers.get('content-type') or ''):await r.abort();return  # 模擬 CORS 擋下
      nc.append((r.request.headers.get('content-type'),r.request.post_data));await r.fulfill(status=200,body='ok')
    await ctx.route('https://nocors.example/**',nocors)
    await pg.evaluate("localStorage.removeItem('roby-quiz-chinese-2026-10-22')");await pg.goto(B+'#chinese');await pg.wait_for_timeout(1200)
    await pg.click('text=我讀完了');await pg.wait_for_timeout(300);cq=pg.locator('.q')
    await cq.nth(0).locator('.opt').nth(1).click();await cq.nth(1).locator('input').fill('海棠');await cq.nth(2).locator('.opt').nth(1).click();await cq.nth(3).locator('.opt').nth(0).click()
    await pg.click('.go');await pg.wait_for_timeout(2500)
    ob=await pg.evaluate('__roby.outbox()');print('fallback sends',len(nc),'ctype',nc[0][0] if nc else None,'auth in body',('"authorization":"Bearer NC"' in nc[0][1]) if nc else None,'queue',[(x['kind'],x.get('status')) for x in ob])
    await pg.reload();await pg.wait_for_timeout(2500);print('fallback sends after reload (stays 1)',len(nc))
    print('errors',errs);await br.close()
asyncio.run(main())
