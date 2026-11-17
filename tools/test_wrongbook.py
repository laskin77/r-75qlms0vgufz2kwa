# 測試：11/18 出題不變；11/25–27 改為錯題本練習（不出新題、不刪 localStorage key）
# 用法：python3 tools/test_wrongbook.py
import json,os,re,subprocess,sys,time
from playwright.sync_api import sync_playwright

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
PORT='8767'
B='http://localhost:%s/'%PORT
ok=[]
def check(name,c,detail=''):
    ok.append((name,bool(c)))
    print(('PASS ' if c else 'FAIL ')+name+(('  '+detail) if detail and not c else ''))

def load_qs():
    s=open(os.path.join(ROOT,'review/questions.js'),encoding='utf-8').read().strip()
    if s.startswith('window.CR_DATA='): s=s[len('window.CR_DATA='):]
    if s.endswith(';'): s=s[:-1]
    return json.loads(s)['questions']

def entry(q, date, **extra):
    e={
        'key':'chinese|%s|cr-%s'%(date,q['id']),
        'subject':'chinese','date':date,'id':'cr-'+q['id'],
        'title':'八上二段國文複習','origin':'chinese-review','qid':q['id'],
        'topic':q.get('topic') or '',
        'lesson':q.get('lesson') or '',
        'added_at':date+'T12:00:00.000Z','fixed':False,
    }
    if q.get('type')=='passage':
        e['question']=q.get('text') or q.get('title') or ''
        e['answer']='、'.join('%s→%s（%s）'%(er['wrong'],er['right'],er['word']) for er in q.get('errors') or [])
    else:
        e['question']=q.get('question') or ''
        e['stem']=q.get('question') or ''
        if q.get('passage'): e['passage']=q['passage']
        if q.get('type')=='choice':
            e['options']=list(q.get('options') or [])
            e['answer_index']=q.get('answer')
            ai=q.get('answer')
            if ai is not None and e['options'] and 0<=ai<len(e['options']):
                e['answer']='%s. %s'%(chr(65+ai), e['options'][ai])
        elif q.get('type')=='fill':
            ans=q.get('answer')
            e['answer']=ans[0] if isinstance(ans,list) and ans else ans
        if q.get('explanation'): e['explanation']=q['explanation']
    e.update(extra)
    return e

def sample_book(QS):
    P=[q for q in QS if q.get('type')=='passage']
    X=[q for q in QS if q.get('topic') in ('形音義','注音') and q.get('type') in ('choice','fill')]
    R=[q for q in QS if q.get('topic')=='閱讀' and q.get('type')=='choice']
    book=[]
    # 15 改錯 (11/04–11/16), 25 形音義, 40 閱讀 most-recent dates later
    for i,q in enumerate(P[:25]):
        book.append(entry(q, '2026-11-%02d'%(4+(i%13))))
    for i,q in enumerate(X[:40]):
        book.append(entry(q, '2026-11-%02d'%(4+(i%13))))
    for i,q in enumerate(R[:80]):
        book.append(entry(q, '2026-11-%02d'%(5+(i%13))))
    # review_pass item must be excluded
    passed=entry(R[80] if len(R)>80 else R[-1], '2026-11-10', review_pass=True, review_at='2026-11-20T12:00:00+08:00')
    if passed['qid'] in {e['qid'] for e in book}:
        passed=entry(R[-2], '2026-11-10', review_pass=True, review_at='2026-11-20T12:00:00+08:00')
    book.append(passed)
    # English item must be excluded
    book.append({'key':'english|2026-11-10|e-1','subject':'english','date':'2026-11-10','id':'e-1','qid':'e-1','topic':'單字','question':'hi','options':['a','b'],'answer_index':0,'answer':'A. a'})
    # 李老師-like item only in the book (not in questions.js)
    book.append({
        'key':'chinese|2026-11-17|cr-ls-SE-TEST',
        'subject':'chinese','date':'2026-11-17','id':'cr-ls-SE-TEST','qid':'ls-SE-TEST','orig':'SE-TEST',
        'topic':'李老師的題目','lesson':'愛蓮說','from':'daily','origin':'chinese-review',
        'stem':'下列何者最能說明蓮花的品格？','question':'下列何者最能說明蓮花的品格？',
        'options':['艷麗照人','出淤泥而不染','花開富貴','清香短暫'],
        'answer_index':1,'answer':'B. 出淤泥而不染','added_at':'2026-11-17T12:00:00.000Z','fixed':False
    })
    return book, passed['qid']

def clock(t):
    return "(()=>{const off=new Date('%sT20:00:00+08:00').getTime()-Date.now(),_D=Date;class D extends _D{constructor(...a){if(!a.length)super(_D.now()+off);else super(...a)}static now(){return _D.now()+off}};window.Date=D})()"%t

def main():
    QS=load_qs(); book,passed_id=sample_book(QS)
    srv=subprocess.Popen([sys.executable,'-m','http.server',PORT,'-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
      with sync_playwright() as p:
        br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])

        # ---- 11/18 unchanged even if 錯題本已有資料 ----
        c=br.new_context(locale='zh-TW',timezone_id='Asia/Taipei',service_workers='block',viewport={'width':820,'height':1400})
        c.add_init_script(clock('2026-11-18'))
        c.add_init_script('localStorage.setItem("roby-wrongbook", %s)'%json.dumps(json.dumps(book,ensure_ascii=False)))
        pg=c.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(B+'review/index.html?date=2026-11-18', wait_until='domcontentloaded')
        pg.wait_for_timeout(1500)
        info=pg.evaluate("""()=>{const st=JSON.parse(localStorage['roby-cr-days']||'{}')['2026-11-18']||{};
          return {bar:document.querySelector('.daybar')&&document.querySelector('.daybar').innerText,
            secs:[...document.querySelectorAll('.sec')].map(e=>e.textContent),
            story:document.querySelectorAll('.story').length,
            wrongbook:!!st.wrongbook, n: (st.ids||[]).length,
            secIds:(st.sections||[]).map(s=>({name:s.name,n:s.ids.length})),
            isWB: !!(window.CR_WB&&CR_WB.isWB('2026-11-18'))}}""")
        print('11/18', info, 'errs', errs)
        check('11/18 不是錯題複習模式', (not info['wrongbook']) and ('考前錯題複習' not in (info['bar'] or '')) and info['isWB'] is False)
        names=[s['name'] for s in info['secIds']]
        counts={s['name']:s['n'] for s in info['secIds']}
        # 無當日檔時維持舊行為：merge 不生效，改錯 5／閱讀 10；形音義仍由講義加量出 9。不是錯題模式。
        check('11/18 無當日檔時仍是首輪出題（形音義 9、改錯 5、閱讀 10），不是錯題模式',
              counts.get('形音義選擇題')==9 and counts.get('改錯（整段）')==5 and counts.get('閱讀理解與課文深究')==10 and info['story']==0)
        check('11/18 無頁面錯誤', not errs)
        # keys untouched
        keys=pg.evaluate('Object.keys(localStorage).sort()')
        check('11/18 沒有改名或刪掉 roby-wrongbook', 'roby-wrongbook' in keys)
        c.close()

        # ---- 11/25 wrong-only, missing daily file ----
        c=br.new_context(locale='zh-TW',timezone_id='Asia/Taipei',service_workers='block',viewport={'width':820,'height':1400})
        c.add_init_script(clock('2026-11-25'))
        c.add_init_script('localStorage.setItem("roby-wrongbook", %s)'%json.dumps(json.dumps(book,ensure_ascii=False)))
        pg=c.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        # intercept 11/25 daily file as 404
        pg.route('**/data/chinese/2026-11-25.json*', lambda r: r.fulfill(status=404, body='nf'))
        pg.goto(B+'review/index.html?date=2026-11-25&embed=1', wait_until='domcontentloaded')
        pg.wait_for_timeout(2000)
        info=pg.evaluate("""()=>{const st=JSON.parse(localStorage['roby-cr-days']||'{}')['2026-11-25']||{};
          const kinds={};
          (st.wbq||[]).forEach(q=>{const k=q._wbKind||q.topic; kinds[k]=(kinds[k]||0)+1});
          return {bar:document.querySelector('.daybar')&&document.querySelector('.daybar').innerText,
            secs:[...document.querySelectorAll('.sec')].map(e=>e.textContent),
            story:document.querySelectorAll('.story').length,
            qs:document.querySelectorAll('.q[data-id]').length,
            pq:document.querySelectorAll('.q.pq').length,
            opts:document.querySelectorAll('.opt').length,
            wrongbook:!!st.wrongbook, n:(st.ids||[]).length, ids:st.ids||[],
            secIds:(st.sections||[]).map(s=>({name:s.name,n:s.ids.length})),
            kinds, started:!!st.started, wbDay:st.wbDay, keys:Object.keys(localStorage).sort()}}""")
        print('11/25', {k:info[k] for k in info if k!='ids'}, 'errs', errs)
        check('11/25 標示考前錯題複習 第 1／3 天', '考前錯題複習 第 1／3 天' in (info['bar'] or '') and info['wbDay']==1)
        check('11/25 wrongbook 模式、無故事、無頁面錯誤', info['wrongbook'] and info['story']==0 and not errs)
        check('11/25 約 60 題', 50<=info['n']<=60, 'n=%s'%info['n'])
        kinds=info['kinds']; nP=kinds.get('改錯',0); nX=kinds.get('形音義',0); nR=kinds.get('閱讀',0)
        # 形音義 may be counted via topic 注音 too — _wbKind should be 形音義
        check('11/25 題型混合：改錯約 8–10、形音義約 15–20、其餘閱讀',
              8<=nP<=12 and 15<=nX<=25 and nR>=20 and nP+nX+nR==info['n'],
              'kinds=%s'%kinds)
        check('11/25 排除已 review_pass 的題', passed_id not in info['ids'])
        check('11/25 排除英文題、收入書本裡的李老師題', 'e-1' not in info['ids'] and 'ls-SE-TEST' in info['ids'])
        check('11/25 畫面有選擇題與改錯段', info['opts']>0 and info['pq']>0 and info['qs']==info['n'])
        forbidden={'roby-wrongbook','roby-cr-days','roby-cr-progress','roby-cr-weak','roby-cr-plan','roby-cr-sent'}
        check('11/25 指定 key 都還在或沒被改名（wrongbook 仍在）', 'roby-wrongbook' in info['keys'] and 'roby-cr-days' in info['keys'])
        book_after=pg.evaluate("JSON.parse(localStorage['roby-wrongbook']).length")
        check('11/25 沒有刪掉錯題本條目', book_after==len(book), 'before=%s after=%s'%(len(book),book_after))

        # answer first choice question wrongly, ensure review fields written and no new book key
        ans=pg.evaluate("""()=>{
          const q=[...document.querySelectorAll('.q[data-id]')].find(e=>e.querySelector('.opt'));
          if(!q)return {err:'no choice'};
          const id=q.dataset.id, item=window.BY?null:null;
          const rec=(window.CR_DATA.questions||[]).concat((JSON.parse(localStorage['roby-cr-days']||'{}')['2026-11-25']||{}).wbq||[]).find(x=>x.id===id);
          const right=rec&&typeof rec.answer==='number'?rec.answer:0;
          const btns=[...q.querySelectorAll('.opt')];
          const w=right===0?1:0;
          btns[w].click();
          return {id, right, clicked:w};
        }""")
        pg.wait_for_timeout(600)
        rec=pg.evaluate("""(id)=>{
          const book=JSON.parse(localStorage['roby-wrongbook']);
          const hit=book.filter(x=>(x.qid===id||x.id==='cr-'+id||x.id===id||x.key&&x.key.indexOf(id)>=0));
          const keys=book.map(x=>x.key);
          const days=JSON.parse(localStorage['roby-cr-days']||'{}')['2026-11-25'];
          return {hit:hit.map(x=>({key:x.key,qid:x.qid,review_pass:x.review_pass,review_at:x.review_at,review_wrong_count:x.review_wrong_count})),
                  newToday:keys.filter(k=>k&&k.indexOf('chinese|2026-11-25|')===0),
                  n:book.length, started:!!(days&&days.started), ids:(days&&days.ids)||[]};
        }""", ans['id'] if isinstance(ans,dict) else None)
        print('after one answer', ans, rec)
        check('11/25 作答後寫入 review_pass／review_at，不新增今日錯題 key、不刪條目',
              rec['n']==len(book) and rec['newToday']==[] and rec['hit'] and rec['hit'][0].get('review_at') and rec['hit'][0].get('review_pass') is False)
        ids1=list(info['ids'])

        # reload keeps picks
        pg.reload(wait_until='domcontentloaded'); pg.wait_for_timeout(1500)
        ids2=pg.evaluate("JSON.parse(localStorage['roby-cr-days'])['2026-11-25'].ids")
        check('11/25 已開始後重新整理保留同一組題', ids2==ids1)
        c.close()

        # ---- 11/26 no overlap with 11/25; 11/27 second pass ----
        c=br.new_context(locale='zh-TW',timezone_id='Asia/Taipei',service_workers='block',viewport={'width':820,'height':1400})
        c.add_init_script(clock('2026-11-26'))
        # seed book + a finished 11/25 day with some review failures
        fail_ids = [e['qid'] for e in book if e.get('topic')=='改錯'][:3]
        book2=json.loads(json.dumps(book))
        for e in book2:
            if e.get('qid') in fail_ids:
                e['review_pass']=False; e['review_at']='2026-11-25T21:00:00+08:00'; e['review_wrong_count']=1
        # 11/25 saved day: first 10p+20x+30r as the live picker would, but we'll let the page set 11/25 from a pre-written days object after first opening 11/25...
        # Simpler: open 11/25 first in this context (unstarted) to write days, then mark those first 3 改錯 as review failures, then open 11/26 and 11/27.
        c.add_init_script('localStorage.setItem("roby-wrongbook", %s)'%json.dumps(json.dumps(book2,ensure_ascii=False)))
        pg=c.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(B+'review/index.html?date=2026-11-25', wait_until='domcontentloaded'); pg.wait_for_timeout(1200)
        d25=pg.evaluate("JSON.parse(localStorage['roby-cr-days'])['2026-11-25']")
        # mark started so 11/25 keeps picks when we change date
        pg.evaluate("""ids=>{
          const days=JSON.parse(localStorage['roby-cr-days']);
          days['2026-11-25'].started=true;
          const book=JSON.parse(localStorage['roby-wrongbook']);
          const fail=ids.slice(0,3);
          book.forEach(x=>{if(fail.indexOf(x.qid)>=0 || fail.indexOf((x.id||'').replace(/^cr-/,''))>=0){x.review_pass=false;x.review_at='2026-11-25T21:00:00+08:00';x.review_wrong_count=1}});
          localStorage.setItem('roby-cr-days',JSON.stringify(days));
          localStorage.setItem('roby-wrongbook',JSON.stringify(book));
          return fail;
        }""", d25['ids'])
        ids25=d25['ids']
        # now 11/26
        pg.goto(B+'review/index.html?date=2026-11-26', wait_until='domcontentloaded'); pg.wait_for_timeout(1500)
        d26=pg.evaluate("(()=>{const st=JSON.parse(localStorage['roby-cr-days'])['2026-11-26']||{};const bar=document.querySelector('.daybar')&&document.querySelector('.daybar').innerText;return {n:(st.ids||[]).length,ids:st.ids||[],bar,wrongbook:!!st.wrongbook,wbDay:st.wbDay,secs:(st.sections||[]).map(s=>({name:s.name,n:s.ids.length}))}})()")
        print('11/26', {k:d26[k] for k in d26 if k!='ids'})
        overlap=set(ids25)&set(d26['ids'])
        check('11/26 是第 2／3 天且與 11/25 不重複', d26['wrongbook'] and d26['wbDay']==2 and '第 2／3 天' in (d26['bar'] or '') and not overlap, 'overlap=%s'%sorted(overlap)[:5])
        check('11/26 約 60 題', 55<=d26['n']<=60, 'n=%s'%d26['n'])
        # 11/27
        pg.goto(B+'review/index.html?date=2026-11-27', wait_until='domcontentloaded'); pg.wait_for_timeout(1500)
        d27=pg.evaluate("""()=>{const st=JSON.parse(localStorage['roby-cr-days'])['2026-11-27']||{};
          return {n:(st.ids||[]).length,ids:st.ids||[],bar:document.querySelector('.daybar')&&document.querySelector('.daybar').innerText,
            wrongbook:!!st.wrongbook,wbDay:st.wbDay,second:Object.keys(st.wbSecond||{}),
            secs:(st.sections||[]).map(s=>({name:s.name,n:s.ids.length})),
            errs:null}}""")
        print('11/27', {k:d27[k] for k in d27 if k!='ids'})
        overlap27=set(d27['ids'])&(set(ids25)|set(d26['ids']))
        # second-pass may overlap 11/25 failed items — that's intended
        first27=set(d27['ids'])-set(d27['second'])
        bad_ol=first27&(set(ids25)|set(d26['ids']))
        check('11/27 是第 3／3 天、總題數 ≤70', d27['wrongbook'] and d27['wbDay']==3 and '第 3／3 天' in (d27['bar'] or '') and d27['n']<=70)
        check('11/27 第一遍不與前兩日重複', not bad_ol, 'overlap first=%s'%sorted(bad_ol)[:6])
        check('11/27 附上 11/25 再錯的第二遍', len(d27['second'])>=1 and set(d27['second'])<=set(d27['ids']), 'second=%s'%d27['second'])
        check('11/26–27 無頁面錯誤', not errs)
        c.close(); br.close()
    finally:
        srv.terminate()
    failed=[n for n,c in ok if not c]
    print('--- %d passed, %d failed ---'%(len(ok)-len(failed), len(failed)))
    return 1 if failed else 0

if __name__=='__main__':
    sys.exit(main())
