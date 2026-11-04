/* Roby 單頁 App v2：執行時讀 data/*.json（cache:no-store），開啟與切回前景時重新讀取 */
(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){localStorage.setItem(k,JSON.stringify(v))}};
var p2=function(n){return String(n).padStart(2,'0')};
function tpeToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
var qd=new URLSearchParams(location.search).get('date');
var DATE=/^\d{4}-\d{2}-\d{2}$/.test(qd||'')?qd:tpeToday();
function dobj(s){var a=s.split('-');return new Date(+a[0],a[1]-1,+a[2])}
function ymd(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
var WD='日一二三四五六';
function md(s){var d=dobj(s);return (d.getMonth()+1)+'/'+d.getDate()}
function mdw(s){var d=dobj(s);return md(s)+'（'+WD[d.getDay()]+'）'}
function monday(s){var d=dobj(s),k=d.getDay()||7;d.setDate(d.getDate()-k+1);return ymd(d)}
function addDays(s,n){var d=dobj(s);d.setDate(d.getDate()+n);return ymd(d)}
function nowIso(){return new Date().toISOString()}
function hm(ms){return new Date(ms).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}
function tpeNowText(){var n=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Taipei'}));return (n.getMonth()+1)+'/'+n.getDate()+'（'+WD[n.getDay()]+'）'}

/* ---------- 資料讀取 ---------- */
var RAW={},DATA={};
function getJSON(path){return fetch(path,{cache:'no-store'}).then(function(r){return r.ok?r.text():null}).catch(function(){return null})}
var WK=monday(DATE),MON=DATE.slice(0,7),PREVWK=addDays(WK,-7),PM=(function(){var d=dobj(DATE);d.setDate(1);d.setMonth(d.getMonth()-1);return ymd(d).slice(0,7)})();
var SRC={config:'data/config.json',checklist:'data/checklist/'+DATE+'.json',chinese:'data/chinese/'+DATE+'.json',english:'data/english/'+DATE+'.json',
 weekly:'data/weekly/'+WK+'.json',weeklyPrev:'data/weekly/'+PREVWK+'.json',monthly:'data/monthly/'+MON+'.json',monthlyPrev:'data/monthly/'+PM+'.json'};
function load(){var ks=Object.keys(SRC);return Promise.all(ks.map(function(k){return getJSON(SRC[k]+'?t='+Date.now())})).then(function(vs){
 var changed=false;ks.forEach(function(k,i){if(vs[i]!==RAW[k]){RAW[k]=vs[i];changed=true;try{DATA[k]=vs[i]?JSON.parse(vs[i]):null}catch(e){DATA[k]=null;console.warn('JSON 格式錯誤',k,e)}}});
 if(changed||!rendered)render();flush();});}

/* ---------- 角色 ---------- */
var CH={
 check:{img:'monkey-head.png',name:'小猴子',greet:'嗨 Roby！我陪你一起把今天的事做完 🐒',done:'全部完成了！你超棒 🎉',left:'還有 {n} 項，加油～'},
 chinese:{img:'assets/chinese-teacher-face.webp',name:'李清照',greet:'Roby 好，今天李老師陪你讀國文。先讀完再作答喔！',present:'慢慢讀題，想好再選。',correct:['答對了！好細心 ✨','真棒，一點就通！','對！這題你懂了。'],wrong:['差一點點，再想想看～','沒關係，回去看看文章。'],hint:'回到文章找關鍵句，答案常常就在附近。',submit:'送出囉！錯的題目要訂正喔，訂正完才算完成。',done:'全部訂正完成！老師幫你記下來了 🌸'},
 english:{img:'assets/english-teacher-face.webp',name:'蔡英文',greet:'Hi Roby! 蔡老師在這裡，先跟讀、學單字和文法，再做小測驗！',present:'Take your time. 看清楚再選喔！',correct:['Great job! 答對了！','Excellent! 太棒了！','You got it! 對！'],wrong:['Almost! 再試一次～','Not quite. 想想文法規則。'],hint:'注意主詞和時態，再看一次例句。',submit:'Submitted! 錯的地方記得訂正喔。',done:'All done! 全部訂正完成 🎉'}};
function lines(k,d){var b=CH[k]||{},o={};for(var x in b)o[x]=b[x];var cc=((DATA.config||{}).characters||{})[k==='check'?'monkey':k];if(cc){if(cc.name)o.name=cc.name;if(cc.avatar)o.img=cc.avatar;if(cc.full)o.full=cc.full}var g=(d&&d.dialog)||{};for(var y in g)if(g[y]!=null&&g[y]!=='')o[y]=g[y];return o}
function pick(v){return Array.isArray(v)?v[Math.floor(Math.random()*v.length)]:v}
function buddy(k,d,sticky){var L=lines(k,d),w=document.createElement('div');w.className='buddy'+(sticky?' sticky':'');
 w.innerHTML='<div class="av"><img src="'+L.img+'" alt=""><br><b>'+esc(L.name)+'</b></div><div class="bubble"></div>';
 var b=$('.bubble',w);
 w.attach=function(el,anchor){if(!el||!el.parentNode)return;anchor=anchor||el;var t0=anchor.getBoundingClientRect().top;
  if(el.classList.contains('q')){if(el.previousSibling===w)return;el.parentNode.insertBefore(w,el)}
  else{var hd=$('.step-h',el)||el.firstChild;if(w.parentNode===el&&w.previousSibling===hd)return;if(hd&&hd.nextSibling)el.insertBefore(w,hd.nextSibling);else el.appendChild(w)}
  w.classList.add('inline');var d=anchor.getBoundingClientRect().top-t0;if(d&&document.body.contains(anchor))window.scrollBy(0,d)};
 w.say=function(t){b.textContent=t;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')};w.L=L;w.say(L.greet);return w}

/* ---------- 送出佇列（webhook）---------- */
var OB='roby-outbox';
function enqueue(kind,payload,dedupe){var q=LS.get(OB,[]);if(dedupe)q=q.filter(function(x){return x.dedupe!==dedupe||x.status==='unconfirmed'});
 q.push({id:Date.now()+'-'+Math.random().toString(36).slice(2,6),kind:kind,payload:payload,dedupe:dedupe||null,queued_at:nowIso(),tries:0});LS.set(OB,q);obStatus();flush();}
var flushing=false;
function hdrs(w){var h={'Content-Type':'application/json'},src=w.headers||{};for(var k in src)if(src[k]!=null&&String(src[k])!==''){var val=String(src[k]).trim();if(k.toLowerCase()==='authorization')val=val.replace(/^authorization\s*:\s*/i,'');h[k]=val}
 if(w.key&&!Object.keys(h).some(function(k){return k.toLowerCase()==='x-roby-key'}))h['X-Roby-Key']=w.key;return h}
function authOf(h){for(var k in h)if(k.toLowerCase()==='authorization')return h[k];return ''}
/* 回傳 'ok' | 'fail' | 'unconfirmed' */
function post(w,payload){var h=hdrs(w),body=Object.assign({},payload);if(w.key)body.key=w.key;
 return fetch(w.url,{method:'POST',headers:h,body:JSON.stringify(body)}).then(function(r){return r.ok?'ok':'fail'}).catch(function(){
  if(navigator.onLine===false)return 'fail';
  /* CORS／網路錯誤：no-cors 無法帶 Authorization，改把它放進 body 的 authorization 欄位只送一次；回應不可讀 → 標記「已送出未確認」，不再重送 */
  var fb=Object.assign({},body,{authorization:authOf(h)});
  return fetch(w.url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(fb)}).then(function(){return 'unconfirmed'}).catch(function(){return 'fail'});});}
function flush(){if(flushing)return Promise.resolve();var q=LS.get(OB,[]).filter(function(x){return x.status!=='unconfirmed'});if(!q.length){obStatus();return Promise.resolve()}
 flushing=true;return getJSON(SRC.config+'?t='+Date.now()).then(function(t){var cfg={};try{cfg=JSON.parse(t||'{}')}catch(e){}
  var wh=(cfg&&cfg.webhooks)||{};
  return q.reduce(function(p,it){return p.then(function(){var w=wh[it.kind]||{};if(!w.url)return;
   return post(w,it.payload).then(function(res){var cur=LS.get(OB,[]);
    cur=res==='ok'?cur.filter(function(x){return x.id!==it.id}):cur.map(function(x){if(x.id===it.id){x.tries++;x.last_try=nowIso();if(res==='unconfirmed'){x.status='unconfirmed';x.sent_at=nowIso()}}return x});
    var un=cur.filter(function(x){return x.status==='unconfirmed'});if(un.length>30){var drop=un.slice(0,un.length-30).map(function(x){return x.id});cur=cur.filter(function(x){return drop.indexOf(x.id)<0})}
    LS.set(OB,cur);});});},Promise.resolve());
 }).then(function(){flushing=false;obStatus()},function(){flushing=false;obStatus()});}
function obStatus(){var n=LS.get(OB,[]).filter(function(x){return x.status!=='unconfirmed'}).length,e=$('#outbox');if(!e)return;e.hidden=!n;e.textContent='📮 待送出 '+n+' 筆（連線後自動補送）';}
window.addEventListener('online',flush);

/* ---------- 答案比對 ---------- */
function norm(s){return String(s==null?'':s).replace(/[\uff01-\uff5e]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xfee0)}).replace(/\u3000/g,' ').replace(/\s+/g,'').replace(/[。．.，,、！!？?；;：:「」『』"']/g,'').toLowerCase()}
function stripLbl(s){return String(s).replace(/^\s*[\(（]?[A-Da-d1-4][\)）\.．、:]\s*/,'')}
function ansIndex(ans,opts){if(Array.isArray(ans))ans=ans[0];
 if(typeof ans==='number'&&ans>=0&&ans<opts.length&&Math.floor(ans)===ans)return ans;
 var s=String(ans==null?'':ans).trim();
 if(/^\d+$/.test(s)&&+s<opts.length)return +s;
 if(/^[A-Da-d]$/.test(s))return s.toUpperCase().charCodeAt(0)-65;
 var m=s.match(/^[\(（]?([A-Da-d])[\)）\.．、:]/);if(m&&opts.length>4===false){var byTxt=opts.findIndex(function(o){return norm(o)===norm(s)});if(byTxt>=0)return byTxt;return m[1].toUpperCase().charCodeAt(0)-65}
 var i=opts.findIndex(function(o){return norm(o)===norm(s)});if(i>=0)return i;
 i=opts.findIndex(function(o){return norm(stripLbl(o))===norm(stripLbl(s))});return i;}
function isRight(it,v){if(v==null||v==='')return false;if(it.kind==='fill'){return it.acc.some(function(a){return norm(a)===norm(v)})}return +v===it.ai}
function ansText(it){return it.kind==='fill'?it.acc.join(' / '):(it.opts[it.ai]!=null?it.opts[it.ai]:'')}
function yourText(it,v){return v==null||v===''?'（未作答）':it.kind==='fill'?v:it.opts[+v]}
/* 題目正規化：choice / fill / group */
function normItems(qs,prefix){var out=[];(qs||[]).forEach(function(q,k){var id=q.id||(prefix+(k+1));
 if(q.type==='group'||q.items||q.questions){var subs=q.items||q.questions||[];subs.forEach(function(s,j){var it=one(s,s.id||(id+'-'+(j+1)));if(j===0)it.group=q.passage||q.text||'',it.gtitle=q.question||q.title||'';out.push(it)})}
 else out.push(one(q,id));});
 function one(q,id){var opts=q.options||[];var kind=q.type==='fill'||(!opts.length&&q.type!=='choice')?'fill':'choice';
  var acc=Array.isArray(q.answer)?q.answer.map(String):[String(q.answer==null?'':q.answer)];
  return {id:id,kind:kind,q:q.question||q.text||'',opts:opts,ai:kind==='choice'?ansIndex(q.answer,opts):-1,acc:acc,exp:q.explanation||'',hint:q.hint||'',src:q.source||'',pid:q.passage_id||q.passageId||''}}
 return out;}

/* ---------- 錯題本 ---------- */
var WBK='roby-wrongbook';
function wbAdd(subj,date,it,v,title){var a=LS.get(WBK,[]),key=subj+'|'+date+'|'+it.id;a=a.filter(function(x){return x.key!==key});
 a.unshift({key:key,subject:subj,date:date,id:it.id,title:title||'',question:it.q||it.gtitle||'',options:it.opts,answer:ansText(it),yours:yourText(it,v),explanation:it.exp,added_at:nowIso(),fixed:false});LS.set(WBK,a)}
function wbFix(subj,date,id){var a=LS.get(WBK,[]);a.forEach(function(x){if(x.key===subj+'|'+date+'|'+id){x.fixed=true;x.fixed_at=nowIso()}});LS.set(WBK,a)}

/* ---------- 測驗區塊（作答→送出→對錯→訂正→完成）---------- */
function quizBlock(o){/* o:{el,items,st(物件),save(),bud,subj,date,title,onDone,scored,label} */
 var st=o.st;st.cur=st.cur||{};var items=o.items,L=o.bud.L,box=document.createElement('div');o.el.appendChild(box);
 function draw(){box.innerHTML='';
  items.forEach(function(it,k){var q=document.createElement('div');q.className='q';q.dataset.id=it.id;var v=st.cur[it.id],sub=!!st.submitted,ok=sub&&isRight(it,v);
   var h='';if(it.group)h+=(it.gtitle?'<div class="qt"><b>'+esc(it.gtitle)+'</b></div>':'')+'<div class="passage">'+esc(it.group)+'</div>';
   h+='<div class="qt"><span class="n">'+(o.label?o.label(it,k):(k+1)+'.')+'</span>'+esc(it.q)+(sub?'<span class="mark '+(ok?'ok':'ng')+'">'+(ok?'✓':'✗ 請訂正')+'</span>':'')+'</div>';
   if(it.kind==='choice')h+='<div class="opts">'+it.opts.map(function(t,i){var c='opt';if(+v===i&&v!==''&&v!=null)c+=' sel';if(sub&&ok&&i===it.ai)c+=' right';if(sub&&!ok&&+v===i&&v!=null)c+=' bad';return '<button class="'+c+'" data-i="'+i+'"'+(ok?' disabled':'')+'>'+String.fromCharCode(65+i)+'. '+esc(t)+'</button>'}).join('')+'</div>';
   else h+='<input class="fill" value="'+esc(v||'')+'" placeholder="填入答案"'+(ok?' disabled':'')+' autocomplete="off" autocapitalize="off">';
   if(sub&&(ok||st.first&&!isRight(it,st.first[it.id]))&&ok)h+=(it.exp?'<div class="exp">💡 '+esc(it.exp)+'</div>':'');
   else if(sub)h+='<div class="exp">🔎 提示：'+esc(it.hint||L.hint)+(it.exp&&st.rounds&&st.rounds.length>1?'<br>💡 '+esc(it.exp):'')+'</div>';
   q.innerHTML=h;box.appendChild(q);
   $$('.opt',q).forEach(function(b){b.onclick=function(){st.cur[it.id]=+b.dataset.i;o.save();last=it.id;draw();react(it,k)}});
   var f=$('.fill',q);if(f){f.oninput=function(){st.cur[it.id]=f.value;o.save()};f.onfocus=function(){last=it.id;o.bud.attach(q,f);o.bud.say(sub?'改好了就按「再檢查訂正」！':'第 '+(k+1)+' 題：想一想再寫～')};f.onchange=function(){if(sub)react(it,k)}}});
  var wrong=items.filter(function(it){return !isRight(it,st.cur[it.id])});
  if(st.submitted){var fc=items.filter(function(it){return isRight(it,st.first[it.id])}).length;
   var t=document.createElement('div');t.className='tally';t.innerHTML='第一次：<span class="ok">對 <b>'+fc+'</b></span>・<span class="no">錯 <b>'+(items.length-fc)+'</b></span>'+(st.done?'・<span class="ok-tag">✓ 已全部訂正</span>':'・待訂正 '+wrong.length);box.appendChild(t);}
  if(!st.done){var b=document.createElement('button');b.className='go';b.textContent=st.submitted?'再檢查訂正':'送出答案';b.onclick=submit;box.appendChild(b)}
  if(last){var qe=$('.q[data-id="'+last+'"]',box);if(qe)o.bud.attach(qe)}
 }
 var last=null,said={};
 function react(it,k){var q=$('.q[data-id="'+it.id+'"]',box);if(!q)return;o.bud.attach(q);
  if(st.submitted)o.bud.say(isRight(it,st.cur[it.id])?pick(L.correct)+' 按「再檢查訂正」確認。':'🔎 '+(it.hint||L.hint));
  else{var n=items.filter(function(x){var v=st.cur[x.id];return v==null||v===''}).length;o.bud.say(n?(!said.p?L.present:'好，還剩 '+n+' 題～'):'全部寫完了，檢查一下再送出！');said.p=1}}
 function submit(){var miss=items.filter(function(it){var v=st.cur[it.id];return v==null||v===''});
  if(miss.length){var e=$('.q[data-id="'+miss[0].id+'"]',box);last=miss[0].id;if(e){o.bud.attach(e);e.scrollIntoView({behavior:'smooth',block:'center'})}o.bud.say('還有 '+miss.length+' 題沒寫喔～');return}
  var wrong=items.filter(function(it){return !isRight(it,st.cur[it.id])});
  if(!st.submitted){st.submitted=true;st.first=JSON.parse(JSON.stringify(st.cur));st.submitted_at=nowIso();st.rounds=[];
   if(o.track!==false)wrong.forEach(function(it){wbAdd(o.subj,o.date,it,st.cur[it.id],o.title)});
   o.bud.say((wrong.length?pick(L.wrong)+' ':pick(L.correct)+' ')+(wrong.length?L.submit:''));}
  else{var prev=st.rounds.length?st.rounds[st.rounds.length-1].wrong:items.filter(function(it){return !isRight(it,st.first[it.id])}).map(function(it){return it.id});
   prev.forEach(function(id){var it=items.find(function(x){return x.id===id});if(it&&isRight(it,st.cur[id])&&o.track!==false)wbFix(o.subj,o.date,id)});
   o.bud.say(wrong.length?pick(L.wrong)+' 還有 '+wrong.length+' 題。':pick(L.correct));}
  st.rounds.push({at:nowIso(),wrong:wrong.map(function(it){return it.id}),answers:JSON.parse(JSON.stringify(st.cur))});
  if(!wrong.length){st.done=true;st.done_at=nowIso();if(o.track!==false)items.forEach(function(it){if(!isRight(it,st.first[it.id]))wbFix(o.subj,o.date,it.id)})}
  last=wrong.length?wrong[0].id:null;o.save();draw();
  if(wrong.length){var we=$('.q[data-id="'+wrong[0].id+'"]',box);if(we){we.scrollIntoView({behavior:'smooth',block:'center'});o.bud.say((st.rounds.length>1?pick(L.wrong):L.submit)+' 🔎 '+(wrong[0].hint||L.hint))}}
  else o.bud.attach(box.closest('.card'));
  if(st.done&&o.onDone)o.onDone();}
 draw();return {items:items,firstCorrect:function(){return items.filter(function(it){return isRight(it,st.first&&st.first[it.id])}).length}};}

/* ---------- 科目頁 ---------- */
function subjPage(subj,root){var D=DATA[subj],bud=buddy(subj,D,false);root.appendChild(bud);
 if(subj==='chinese'){var fw=document.createElement('div');fw.className='review-embed';fw.innerHTML='<div class="re-h"><b>📚 八上二段國文複習・今日題目</b><a href="review/index.html" target="_blank">單獨開啟 ↗</a></div><iframe id="reviewFrame" src="review/index.html?embed=1" scrolling="no" title="八上二段國文複習"></iframe>';root.appendChild(fw);
  var fr=$('iframe',fw);fr.onload=function(){try{var d=fr.contentDocument,fit=function(){var h=d.documentElement.scrollHeight;if(h&&Math.abs(h-fr.offsetHeight)>2)fr.style.height=h+'px'};fit();if(window.ResizeObserver)new ResizeObserver(fit).observe(d.body);setInterval(fit,800)}catch(e){fr.style.height='1600px';fr.setAttribute('scrolling','yes')}}}
 if(!D){if(subj==='chinese'){bud.say('今天的複習題目在下面，加油！');return}root.appendChild(empty('今天沒有英文功課喔，休息一下',bud.L.img));bud.say('今天沒有新的題目，明天見！');return}
 var KEY='roby-quiz-'+subj+'-'+(D.date||DATE),st=LS.get(KEY,{});st.started_at=st.started_at||nowIso();st.blocks=st.blocks||{};st.steps=st.steps||{};
 var save=function(){LS.set(KEY,st)};save();
 if(subj==='chinese')root.insertAdjacentHTML('beforeend','<div class="sec-gap">⬇️ 李老師的今日國文功課</div>');var h=document.createElement('h1');h.textContent=(subj==='english'?'英文 ':'國文 ')+mdw(D.date||DATE);root.appendChild(h);
 if(D.title||D.topic){var s=document.createElement('div');s.className='sub';s.textContent=D.title||D.topic;root.appendChild(s)}
 if(bud.L.full)root.insertAdjacentHTML('beforeend','<img src="'+bud.L.full+'" alt="" style="display:block;width:46%;max-width:300px;margin:0 auto;border-radius:16px;mix-blend-mode:multiply">');
 var isEN=subj==='english'&&(D.shadow||D.uoe||D.vocab||D.grammar);
 (isEN?englishFlow:genericFlow)(subj,D,root,bud,st,save);
 var cards=$$('.card',root),first=cards.find(function(c){var t=$('.ok-tag',c);return !c.classList.contains('locked')&&!(t&&t.textContent)})||cards[cards.length-1];
 if(first){var sayNow=bud.L.greet;bud.attach(first);if(first!==cards[0]){var h2=$('h2',first);sayNow=st.completed_at?bud.L.done:'接下來：'+(h2?h2.textContent.replace(/^\S+\s*/,''):'')+'，加油！'}bud.say(sayNow)}
 root.addEventListener('focusin',function(e){if(e.target.tagName==='TEXTAREA'&&!e.target.closest('.q')){var c=e.target.closest('.card');if(c)bud.attach(c,e.target)}});
 root.addEventListener('click',function(e){if(e.target.closest('.buddy,.q,button,a,input,textarea'))return;var c=e.target.closest('.card');if(c&&!c.classList.contains('locked'))bud.attach(c,e.target)});}
function card(root,title,cls){var c=document.createElement('div');c.className='card'+(cls?' '+cls:'');if(title)c.innerHTML='<div class="step-h"><h2>'+title+'</h2><span class="ok-tag"></span></div>';root.appendChild(c);return c}
function lockCard(root,title,msg){var c=card(root,title,'locked');c.insertAdjacentHTML('beforeend','<div>🔒 '+esc(msg)+'</div>');return c}
function finish(subj,D,st,save,bud,payload){if(st.completed_at)return;st.completed_at=nowIso();st.score=payload.score;save();
 enqueue(subj,payload,subj+'-'+payload.date);bud.say(bud.L.done+'（第一次 '+payload.score+' 分）');celebrate();}

function genericFlow(subj,D,root,bud,st,save){var date=D.date||DATE;
 var isST=function(it){return /^ST-/.test(String(it.id||''))},allIt=normItems(D.questions,'q'),stIt=allIt.filter(isST),oq=st.blocks.quiz||{};
 var useCF=subj==='chinese'&&(D.learn||stIt.length)&&!(oq.first&&stIt.some(function(it){return oq.first[it.id]!=null}));
 if(useCF)return chineseFlow(subj,D,root,bud,st,save,allIt.filter(function(it){return !isST(it)}),stIt);
 var learnOK=!D.learn||st.steps.learn;
 if(D.learn){var c=card(root,'📖 '+(D.learn.title||'先學習'));var Lr=D.learn;
  var secs=Lr.sections||(Lr.text?[{title:'',text:Lr.text}]:[]);secs.forEach(function(s){c.insertAdjacentHTML('beforeend',(s.title?'<b>'+esc(s.title)+'</b>':'')+'<div class="passage">'+esc(s.text)+'</div>')});
  (Lr.vocab||[]).forEach(function(v){c.insertAdjacentHTML('beforeend','<div class="voc"><b>'+esc(v.word||v.term)+'</b><i>'+esc(v.pos||'')+'</i>'+esc(v.zh||v.meaning||'')+(v.example?'<div class="ex">'+esc(v.example)+'</div>':'')+'</div>')});
  if(learnOK)$('.ok-tag',c).textContent='✓ 已讀完';else{var b=document.createElement('button');b.className='go';b.textContent='我讀完了，開始作答';b.onclick=function(){st.steps.learn=nowIso();save();render()};c.appendChild(b)}}
 if(!learnOK){lockCard(root,'✏️ 測驗','先讀完上面的內容，測驗就會打開喔！');return}
 if((D.passages||[]).length){var pc=card(root,'📜 閱讀');D.passages.forEach(function(p){pc.insertAdjacentHTML('beforeend','<div class="passage">'+(p.id?'<b>〔'+esc(p.id)+'〕</b>':'')+esc(p.text)+(p.source?'<span class="src">— '+esc(p.source)+'</span>':'')+'</div>')})}
 var qc=card(root,'✏️ 測驗'),items=normItems(D.questions,'q');var bs=st.blocks.quiz=st.blocks.quiz||{};
 if(!bs.submitted)bud.say(lines(subj,D).present);
 var blk=quizBlock({el:qc,items:items,st:bs,save:save,bud:bud,subj:subj,date:date,title:D.title,onDone:done});
 if(bs.done)$('.ok-tag',qc).textContent='✓ 完成';
 function done(){var n=items.length,fc=blk.firstCorrect();
  finish(subj,D,st,save,bud,{subject:subj,date:date,title:D.title||'',score:n?Math.round(fc/n*100):0,first_correct:fc,first_wrong:n-fc,total:n,
   wrong:items.filter(function(it){return !isRight(it,bs.first[it.id])}).map(function(it){return it.id}),
   after_correction:{correct:n,total:n,rounds:bs.rounds.length},answers:{first:bs.first,final:bs.cur,rounds:bs.rounds},
   started_at:st.started_at,submitted_at:bs.submitted_at,completed_at:nowIso()});}}

/* 國文：李老師其他題目在上，今日小故事＋故事小測放最底部（分開計分區塊，合併成一次回報） */
function learnCard(root,Lr,title){var c=card(root,'📖 '+(title||Lr.title||'今日小故事'),'story-learn');
 var secs=Lr.sections||(Lr.text?[{title:'',text:Lr.text}]:[]);secs.forEach(function(s){c.insertAdjacentHTML('beforeend',(s.title?'<b>'+esc(s.title)+'</b>':'')+'<div class="passage">'+esc(s.text)+'</div>')});
 (Lr.vocab||[]).forEach(function(v){c.insertAdjacentHTML('beforeend','<div class="voc"><b>'+esc(v.word||v.term)+'</b><i>'+esc(v.pos||'')+'</i>'+esc(v.zh||v.meaning||'')+(v.example?'<div class="ex">'+esc(v.example)+'</div>':'')+'</div>')});return c}
function chineseFlow(subj,D,root,bud,st,save,mainIt,stIt){var date=D.date||DATE,blks=[];
 if((D.passages||[]).length){var pc=card(root,'📜 閱讀');D.passages.forEach(function(p){pc.insertAdjacentHTML('beforeend','<div class="passage">'+(p.id?'<b>〔'+esc(p.id)+'〕</b>':'')+esc(p.text)+(p.source?'<span class="src">— '+esc(p.source)+'</span>':'')+'</div>')})}
 function mk(el,items,key){var bs=st.blocks[key]=st.blocks[key]||{};var b=quizBlock({el:el,items:items,st:bs,save:save,bud:bud,subj:subj,date:date,title:D.title,onDone:done});if(bs.done)$('.ok-tag',el).textContent='✓ 完成';blks.push({b:b,bs:bs,items:items})}
 if(mainIt.length)mk(card(root,'✏️ 李老師的題目'),mainIt,'quiz');
 root.insertAdjacentHTML('beforeend','<div class="story-sep"><span>📖 今日小故事／故事小測</span></div>');
 if(D.learn){var lc=learnCard(root,D.learn);if(st.steps.learn)$('.ok-tag',lc).textContent='✓ 已讀完';else{var rb=document.createElement('button');rb.className='go';rb.textContent='我讀完了';rb.onclick=function(){st.steps.learn=nowIso();save();render()};lc.appendChild(rb)}}
 if(stIt.length){if(D.learn&&!st.steps.learn)lockCard(root,'✏️ 故事小測','先讀完上面的小故事，故事小測就會打開喔！');else mk(card(root,'✏️ 故事小測','story-quiz'),stIt,'story')}
 var bs0=st.blocks.quiz||{};if(!bs0.submitted)bud.say(lines(subj,D).present);
 function done(){if(blks.length<(mainIt.length?1:0)+(stIt.length?1:0)||!blks.every(function(x){return x.bs.done}))return;
  var items=[],first={},cur={},rounds=0,fc=0,subAt=null;blks.forEach(function(x){items=items.concat(x.items);fc+=x.b.firstCorrect();Object.assign(first,x.bs.first||{});Object.assign(cur,x.bs.cur||{});rounds=Math.max(rounds,(x.bs.rounds||[]).length);subAt=x.bs.submitted_at||subAt});
  var n=items.length;finish(subj,D,st,save,bud,{subject:subj,date:date,title:D.title||'',score:n?Math.round(fc/n*100):0,first_correct:fc,first_wrong:n-fc,total:n,
   wrong:items.filter(function(it){return !isRight(it,first[it.id])}).map(function(it){return it.id}),
   after_correction:{correct:n,total:n,rounds:rounds},answers:{first:first,final:cur,rounds:blks.map(function(x){return x.bs.rounds||[]})},
   started_at:st.started_at,submitted_at:subAt,completed_at:nowIso()});}}

/* 英文（蔡英文老師格式）：shadow → vocab → grammar → uoe → quiz */
var YTP=null,ytReady=null;
function loadYT(){if(ytReady)return ytReady;ytReady=new Promise(function(res){if(window.YT&&YT.Player)return res();window.onYouTubeIframeAPIReady=res;var s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)});return ytReady}
function englishFlow(subj,D,root,bud,st,save){var date=D.date||DATE,S=D.shadow,steps=st.steps,open=true;
 function stepDone(k){return !!steps[k]}
 function mark(c,k,t){if(stepDone(k))$('.ok-tag',c).textContent=t||'✓ 完成'}
 function next(k){steps[k]=steps[k]||nowIso();save();render()}
 /* 1 跟讀 */
 if(S){var c=card(root,'🎧 1. 跟讀 Shadowing');mark(c,'shadow');
  c.insertAdjacentHTML('beforeend','<div class="small">'+esc(S.speaker||'')+(S.source_url?'・<a href="'+esc(S.source_url)+'" target="_blank" rel="noopener">影片來源</a>':'')+'</div><div id="yt"></div>');
  var ch=document.createElement('div');c.appendChild(ch);var chunks=S.chunks&&S.chunks.length?S.chunks:[{start:S.start,end:S.end,text:'（整段）'}],timer=null;
  chunks.forEach(function(k,i){var r=document.createElement('div');r.className='chunk';r.innerHTML='<button>▶ '+(i+1)+'</button><span>'+esc(k.text)+'</span>';r.querySelector('button').onclick=function(){playSeg(k.start,k.end,r)};ch.appendChild(r)});
  var all=document.createElement('button');all.textContent='▶ 整段播放';all.style.marginTop='6px';all.onclick=function(){playSeg(S.start!=null?S.start:chunks[0].start,S.end!=null?S.end:chunks[chunks.length-1].end,null)};c.appendChild(all);
  function playSeg(a,b,row){loadYT().then(function(){var go=function(){$$('.chunk',ch).forEach(function(x){x.classList.remove('play')});if(row)row.classList.add('play');YTP.seekTo(+a||0,true);YTP.playVideo();clearInterval(timer);
    timer=setInterval(function(){try{if(YTP.getCurrentTime()>=+b){YTP.pauseVideo();clearInterval(timer);if(row)row.classList.remove('play')}}catch(e){}},200)};
   if(YTP&&YTP.getIframe&&document.body.contains(YTP.getIframe()))go();else YTP=new YT.Player('yt',{videoId:S.youtubeId,playerVars:{playsinline:1,rel:0,start:Math.floor(+a||0)},events:{onReady:go}});});}
  if((S.phrases||[]).length)c.insertAdjacentHTML('beforeend','<div style="margin-top:8px"><b>好用片語</b>'+S.phrases.map(function(p){return '<div class="voc"><b>'+esc(p.en)+'</b> <span class="small">'+esc(p.zh)+'</span></div>'}).join('')+'</div>');
  var R=S.respond||{};c.insertAdjacentHTML('beforeend','<div style="margin-top:8px"><b>回應</b><div>'+esc(R.prompt_en||'')+'</div><div class="small">'+esc(R.prompt_zh||'')+'</div></div>');
  var ta=document.createElement('textarea');ta.rows=2;ta.placeholder='Write one English sentence…';ta.value=st.shadow_response||'';ta.oninput=function(){st.shadow_response=ta.value;save()};c.appendChild(ta);
  if(!stepDone('shadow')){var b=document.createElement('button');b.className='go';b.textContent='跟讀完成';b.onclick=function(){if(!/[a-z]{2,}/i.test(ta.value)){bud.say('寫一句英文回應再按完成喔！');ta.focus();return}bud.say(pick(bud.L.correct));next('shadow')};c.appendChild(b)}
  if(!stepDone('shadow'))open=false;}
 /* 2 單字 */
 if(D.vocab&&D.vocab.length){if(!open)lockCard(root,'📚 2. 單字','先完成跟讀');else{var v=card(root,'📚 2. 單字 Vocabulary');mark(v,'vocab');
  D.vocab.forEach(function(w){var e=document.createElement('div');e.className='voc';e.innerHTML='<button class="say" style="float:right">🔊</button><b>'+esc(w.word)+'</b><i>'+esc(w.pos||'')+'</i>'+esc(w.zh||'')+(w.example?'<div class="ex">'+esc(w.example)+'</div>':'')+(w.note?'<div class="small">'+esc(w.note)+'</div>':'');
   e.querySelector('.say').onclick=function(){try{var u=new SpeechSynthesisUtterance(w.word);u.lang='en-US';u.rate=.85;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(x){}};v.appendChild(e)});
  if(!stepDone('vocab')){var b2=document.createElement('button');b2.className='go';b2.textContent='單字看完了';b2.onclick=function(){next('vocab')};v.appendChild(b2);open=false}}}
 /* 3 文法 */
 var G=D.grammar;if(G){if(!open)lockCard(root,'🧩 3. 文法','先完成前面的步驟');else{var g=card(root,'🧩 3. 文法 '+esc(G.title||''));mark(g,'grammar');
  g.insertAdjacentHTML('beforeend','<div class="passage">'+esc(G.explain||'')+'</div>'+((G.examples||[]).length?'<ul>'+G.examples.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':''));
  var P=G.practice?(Array.isArray(G.practice)?G.practice:[G.practice]):[];
  if(P.length){g.insertAdjacentHTML('beforeend','<b>練習</b>');var gs=st.blocks.grammar=st.blocks.grammar||{};
   quizBlock({el:g,items:normItems(P.map(function(p,i){return Object.assign({id:'g'+(i+1)},p)}),'g'),st:gs,save:save,bud:bud,subj:subj,date:date,title:D.topic,track:false,onDone:function(){next('grammar')}});
   if(!gs.done)open=false;}
  else if(!stepDone('grammar')){var b3=document.createElement('button');b3.className='go';b3.textContent='文法看懂了';b3.onclick=function(){next('grammar')};g.appendChild(b3);open=false}}}
 /* 4 UOE 克漏字 */
 var U=D.uoe,uItems=[];if(U){uItems=normItems((U.gaps||[]).map(function(x,i){return Object.assign({},x,{id:x.id||'u'+(i+1),question:x.question||'第 '+(i+1)+' 格'})}),'u');
  if(!open)lockCard(root,'📝 4. 克漏字 Use of English','先完成前面的步驟');else{var u=card(root,'📝 4. 克漏字 Use of English');mark(u,'uoe');
   var html=esc(U.passage||'').replace(/_{2,}\s*(\d+)\s*_{2,}/g,function(m,n){return '<span class="gap">('+n+')</span>'});u.insertAdjacentHTML('beforeend','<div class="passage">'+html+'</div>');
   var us=st.blocks.uoe=st.blocks.uoe||{};quizBlock({el:u,items:uItems,st:us,save:save,bud:bud,subj:subj,date:date,title:D.topic,label:function(it,k){return '('+(k+1)+')'},onDone:function(){next('uoe')}});
   if(!us.done)open=false;}}
 /* 5 小測驗 */
 var qItems=normItems((D.quiz||[]).map(function(x,i){return Object.assign({id:'q'+(i+1)},x)}),'q');
 if(!open){lockCard(root,'✏️ 5. 小測驗 Quiz','完成跟讀、單字、文法、克漏字後就會打開！');return}
 var qc=card(root,'✏️ 5. 小測驗 Quiz');var qs=st.blocks.quiz=st.blocks.quiz||{};if(qs.done)$('.ok-tag',qc).textContent='✓ 完成';
 if(!qs.submitted)bud.say(bud.L.present);
 quizBlock({el:qc,items:qItems,st:qs,save:save,bud:bud,subj:subj,date:date,title:D.topic,onDone:done});
 function done(){var us=st.blocks.uoe||{first:{}},qc1=qItems.filter(function(it){return isRight(it,qs.first[it.id])}).length,uc=uItems.filter(function(it){return isRight(it,us.first&&us.first[it.id])}).length;
  var tot=qItems.length+uItems.length,wrong=qItems.concat(uItems).filter(function(it){var f=it.id[0]==='u'&&uItems.indexOf(it)>=0?us.first:qs.first;return !isRight(it,f&&f[it.id])}).map(function(it){return it.id});
  finish(subj,D,st,save,bud,{subject:'english',date:date,quiz:{correct:qc1,total:qItems.length},uoe:{correct:uc,total:uItems.length},score:tot?Math.round((qc1+uc)/tot*100):0,wrong:wrong,
   shadow_response:st.shadow_response||'',completed_at:nowIso(),
   topic:D.topic||'',first_correct:qc1+uc,first_wrong:tot-qc1-uc,after_correction:{correct:tot,total:tot,rounds:{quiz:qs.rounds.length,uoe:(us.rounds||[]).length}},
   answers:{quiz:{first:qs.first,final:qs.cur},uoe:{first:us.first,final:us.cur},grammar:(st.blocks.grammar||{}).cur||{}},started_at:st.started_at,steps:st.steps});}}

/* ---------- 今日檢查 ---------- */
var TK='roby-timer',FOCUS=25*60e3,REST=5*60e3,TM={K:null,S:null,els:[],logs:{}};
/* ---------- 家長 PIN（SHA-256＋salt，存 localStorage roby-parent-pin；不存明文、不進 repo） ---------- */
var PINK='roby-parent-pin';
function pinHash(pin,salt){var d=new TextEncoder().encode(salt+':'+pin);return crypto.subtle.digest('SHA-256',d).then(function(b){return [].map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2)}).join('')})}
function pinSalt(){var a=new Uint8Array(16);crypto.getRandomValues(a);return [].map.call(a,function(x){return ('0'+x.toString(16)).slice(-2)}).join('')}
function pinHas(){var p=LS.get(PINK,null);return !!(p&&p.hash&&p.salt)}
function pinSet(pin){var s=pinSalt();return pinHash(pin,s).then(function(h){LS.set(PINK,{v:1,algo:'SHA-256',salt:s,hash:h,fails:0,lockUntil:0,set_at:nowIso()})})}
/* 回傳 Promise<'ok'|'bad'|'locked'> */
function pinCheck(pin){var p=LS.get(PINK,null);if(!p)return Promise.resolve('bad');if(p.lockUntil&&Date.now()<p.lockUntil)return Promise.resolve('locked');
 return pinHash(pin,p.salt).then(function(h){var q=LS.get(PINK,p);if(h===q.hash){q.fails=0;q.lockUntil=0;LS.set(PINK,q);return 'ok'}q.fails=(q.fails||0)+1;if(q.fails>=5){q.fails=0;q.lockUntil=Date.now()+60e3}LS.set(PINK,q);return q.lockUntil&&Date.now()<q.lockUntil?'locked':'bad'})}
/* 小對話框：steps=[{label}]，回傳輸入值陣列；onSubmit(vals,setMsg) 回傳 Promise<bool 關閉> */
function pinDialog(title,steps,onSubmit){var ov=document.createElement('div');ov.className='pin-ov';var i=0,vals=[];
 ov.innerHTML='<div class="pin-box" role="dialog"><b class="pin-t">'+esc(title)+'</b><div class="pin-l"></div><input class="pin-in" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="PIN"><div class="pin-m"></div><div class="pin-b"><button class="pin-cancel">取消</button><button class="pin-ok">確定</button></div></div>';
 document.body.appendChild(ov);var inp=$('.pin-in',ov),msg=$('.pin-m',ov),lb=$('.pin-l',ov);
 function show(){lb.textContent=steps[i].label;inp.value='';setTimeout(function(){inp.focus()},30)}
 function close(){ov.remove()}
 function go(){var v=inp.value.trim();if(!/^\d{4}$/.test(v)){msg.textContent='請輸入 4 位數字';return}vals.push(v);if(i<steps.length-1){i++;msg.textContent='';show();return}
  $('.pin-ok',ov).disabled=true;Promise.resolve(onSubmit(vals,function(t){msg.textContent=t})).then(function(ok){$('.pin-ok',ov).disabled=false;if(ok)close();else{vals=[];i=0;show()}})}
 inp.addEventListener('input',function(){inp.value=inp.value.replace(/\D/g,'').slice(0,4)});inp.addEventListener('keydown',function(e){if(e.key==='Enter')go()});
 $('.pin-ok',ov).onclick=go;$('.pin-cancel',ov).onclick=close;show();return ov}
function pinMsg(r){if(r==='locked'){var p=LS.get(PINK,{});return '錯太多次，請 '+Math.max(1,Math.ceil(((p.lockUntil||0)-Date.now())/1000))+' 秒後再試'}return 'PIN 不對，再試一次'}
/* 需要家長 PIN 才做 fn；第一次使用先設定 */
function withPin(title,fn){if(!pinHas()){pinDialog('第一次使用：設定家長 PIN',[{label:'請設定 4 位數字 PIN'},{label:'再輸入一次確認'}],function(v,m){if(v[0]!==v[1]){m('兩次不一樣，請重新設定');return false}return pinSet(v[0]).then(function(){fn();return true})});return}
 pinDialog(title,[{label:'請輸入家長 PIN'}],function(v,m){return pinCheck(v[0]).then(function(r){if(r==='ok'){fn();return true}m(pinMsg(r));return false})})}
function pinChange(done){if(!pinHas())return withPin('',function(){toast2('PIN 已設定');done&&done()});
 pinDialog('變更家長 PIN',[{label:'請輸入舊 PIN'},{label:'新 PIN（4 位數字）'},{label:'再輸入一次新 PIN'}],function(v,m){if(v[1]!==v[2]){m('兩次新 PIN 不一樣');return false}
  return pinCheck(v[0]).then(function(r){if(r!=='ok'){m(pinMsg(r));return false}return pinSet(v[1]).then(function(){toast2('PIN 已變更');done&&done();return true})})})}
function toast2(t){var d=document.createElement('div');d.className='pin-toast';d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove()},2200)}
/* ---------- 每日紀錄 roby-daily-<DATE>（家長確認時寫入；週報／月報彙總來源） ---------- */
function dailyRec(date){return LS.get('roby-daily-'+date,null)}
function dailyRange(a,b){var out=[];for(var d=a;d<=b;d=addDays(d,1)){var r=dailyRec(d);if(r)out.push(r)}return out}
function aggDaily(recs){var n=recs.length,avg=function(k){var v=recs.map(function(r){return r.scores&&r.scores[k]}).filter(function(x){return typeof x==='number'});return {days:v.length,avg:v.length?Math.round(v.reduce(function(a,b){return a+b},0)/v.length):null}};
 return {days:n,rate:n?Math.round(recs.reduce(function(a,r){return a+(r.rate||0)},0)/n):null,done:recs.reduce(function(a,r){return a+(r.done||0)},0),total:recs.reduce(function(a,r){return a+(r.total||0)},0),
  contact:recs.filter(function(r){return r.contact_book==='signed'}).length,contactMissing:recs.filter(function(r){return r.contact_book==='missing'}).length,
  english:avg('english'),chinese_review:avg('chinese_review'),chinese_quiz:avg('chinese_quiz'),parent:recs.filter(function(r){return !!r.parent_confirmed_at}).length,
  roby:recs.filter(function(r){return r.roby_confirmed}).length,focus:recs.reduce(function(a,r){return a+(r.focus_minutes||0)},0)}}
function scB(v){return v==null?'—':'<b class="'+(v>=90?'sc-hi':v>=70?'sc-mid':'sc-low')+'">'+v+'</b>'}
function aggCard(title,A,days,recs){var h='<div class="card agg"><h2>'+title+'</h2><p class="small">資料來源：這台 iPad 上家長確認時存的每日紀錄（共 '+A.days+' 天）。</p><table><tr><th>項目</th><th>結果</th></tr>'+
  '<tr><td>完成率（平均）</td><td>'+(A.rate==null?'—':A.rate+'%')+'（'+A.done+' / '+A.total+' 項）</td></tr><tr><td>聯絡簿已簽</td><td>'+A.contact+' / '+days+' 天'+(A.contactMissing?'（未帶 '+A.contactMissing+' 天）':'')+'</td></tr>'+
  '<tr><td>英文大師</td><td>'+A.english.days+' 天・平均 '+scB(A.english.avg)+'</td></tr><tr><td>國文複習</td><td>'+A.chinese_review.days+' 天・平均 '+scB(A.chinese_review.avg)+'</td></tr><tr><td>國文小測驗</td><td>'+A.chinese_quiz.days+' 天・平均 '+scB(A.chinese_quiz.avg)+'</td></tr>'+
  '<tr><td>專注計時</td><td>'+A.focus+' 分鐘</td></tr><tr><td>家長確認天數</td><td>'+A.parent+' / '+days+' 天</td></tr></table>';
 if(recs&&recs.length<=7&&recs.length)h+='<table class="aggd"><tr><th>日期</th><th>完成</th><th>英文</th><th>國文複習</th><th>國文小測</th><th>家長</th></tr>'+recs.map(function(r){var s=r.scores||{};return '<tr><td>'+md(r.date)+'</td><td>'+(r.rate==null?'—':r.rate+'%')+'</td><td>'+scB(s.english)+'</td><td>'+scB(s.chinese_review)+'</td><td>'+scB(s.chinese_quiz)+'</td><td>'+(r.parent_confirmed_at?'✓':'')+'</td></tr>'}).join('')+'</table>';
 return h+'</div>'}
function dlJSON(name,obj){var b=new Blob([JSON.stringify(obj,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function syncRange(kind,label,a,b,extra,fname){var recs=dailyRange(a,b),p=Object.assign({subject:kind,from:a,to:b,days:recs,summary:aggDaily(recs),exported_at:nowIso()},extra||{});
 enqueue('checklist',p,kind+'-'+a);dlJSON(fname,p);toast2(label+'已打包：'+recs.length+' 天（已下載 JSON 並放進送出佇列）');return p}

function checkPage(root){var D=DATA.checklist,K='roby-check-'+DATE,bud=buddy('check',null,false);
 root.insertAdjacentHTML('beforeend','<img class="hero" src="monkey-hero.webp" alt="">');
 root.appendChild(bud);
 if(!D){root.appendChild(empty('今天沒有檢查表喔，等爸爸更新一下 🐒','monkey-head.png'));return}
 var S=LS.get(K,{});if(!S.t)S.t={};
 var h=document.createElement('h1');h.textContent='Roby 今日檢查　'+mdw(D.date||DATE);root.appendChild(h);
 if(D.note)root.insertAdjacentHTML('beforeend','<div class="card tip">'+esc(D.note)+'</div>');
 (D.warning||[]).forEach(function(w){root.insertAdjacentHTML('beforeend','<div class="card warn"><b>⚠️ '+esc(w)+'</b></div>')});
 function lab(text,extra,alt){return '<label'+(alt?' class="alt"':'')+'><input type="checkbox"'+(extra||'')+'><span>'+text+'</span></label>'}
 function dueTxt(t){return esc(t.text)+(t.due?' — <span class="due">'+esc(dueFmt(t.due))+'</span>':'')}
 var html='';
 if((D.plan||[]).length)html+='<div class="card"><h2>讀書計畫進度</h2>'+D.plan.map(function(p){p=typeof p==='string'?{text:p,timer:true}:p;return p.timer===false?lab(esc(p.text)):'<div data-t>'+lab(esc(p.text))+'</div>'}).join('')+'</div>';
 if((D.daily||[]).length){html+='<div class="card"><h2>每日必做</h2>';D.daily.forEach(function(d){
  if(typeof d==='string')d={text:d};
  if(d.pair||d.type==='pair'){var pr=d.pair||['聯絡簿已簽','聯絡簿未帶'];html+='<div class="pair">'+lab(esc(pr[0]),' data-excl="cb"')+lab('<span class="tagred">'+esc(pr[1])+'</span>',' data-excl="cb"',true)+'</div>';return}
  var sc=d.subject?'<span class="score" data-subj="'+esc(d.subject)+'" data-score="'+esc(d.score==null?'':d.score)+'" data-label="'+esc(d.label||'小測驗')+'"></span>':'';
  html+=lab(esc(d.text)+sc,d.subject?' data-subj="'+esc(d.subject)+'"':'')});html+='</div>';}
 if((D.weekTodo||[]).length)html+='<div class="card"><h2>本週待完成（做完就勾，沒勾會一直帶到下一天）</h2>'+D.weekTodo.map(function(t){return (t.timer===false?'':'<div data-t>')+lab(dueTxt(t))+(t.timer===false?'':'</div>')}).join('')+'</div>';
 html+='<div class="card"><h2>備註</h2><textarea rows="3" placeholder="今天的狀況…"></textarea></div>';
 html+='<div class="card"><h2>Roby 確認</h2>'+lab('我已經自己檢查完今天的項目',' id="confirm"')+'</div>';
 html+='<div class="card pcard"><h2>家長確認</h2><label class="pc-l"><input type="checkbox" id="pconfirm"><span>家長已確認今天的項目（需 PIN）</span></label><div class="small" id="pcst"></div><div class="pc-btns noprint"><button id="pcunlock">🔓 解鎖修改</button><button id="pcchg">變更 PIN</button><button id="pcexp">匯出今日紀錄（JSON）</button></div></div>';
 html+='<img class="foot" src="cat-foot.webp" alt="讀書的小貓"><div class="footnote">慢慢來，比較快</div>';
 var wrap=document.createElement('div');wrap.innerHTML=html;while(wrap.firstChild)root.appendChild(wrap.firstChild);
 /* 八上二段國文複習：一律自動多一列（不佔原本勾選框索引，不影響已存的勾選狀態）*/
 (function(){var days=LS.get('roby-cr-days',{}),d=days[DATE],n=d?d.ids.length:0,a=d?(d.first?n:Object.keys(d.f1||{}).length):0,done=!!(d&&d.first),sc=done?d.score:null;
  var info='<small class="cr-prog">　'+(d&&a?a+' / '+n+' 題（'+Math.round(a/n*100)+'%）':'尚未開始')+(d&&a&&!done?'・作答中':'')+'</small>';
  if(d&&!done&&a>0&&a>=n-2){var rk=DATE+':'+a;if(window.__crRep!==rk){window.__crRep=rk;var hf=document.getElementById('crRepair');if(hf)hf.remove();hf=document.createElement('iframe');hf.id='crRepair';hf.style.display='none';hf.src='review/index.html?embed=1&repair=1&t='+Date.now();document.body.appendChild(hf)}if(a>=n)info=info.replace('作答中','結算中…')}
  var ex=$('input[data-subj="chinese"]',root);
  if(ex){var lb=ex.parentNode,sp=$('.score',lb),q=LS.get('roby-quiz-chinese-'+DATE,null);$('span',lb).insertAdjacentHTML('beforeend','<span class="cr-merge">｜八上二段國文複習'+info+'<span class="score cr-score" data-score="'+(sc==null?'':sc)+'" data-label="複習"></span></span>');
   if(done&&!(q&&q.completed_at)){ex.dataset.crdone='1'}return}
  var row='<label class="cr-row"><input type="checkbox" class="cr-auto" data-cr="1"'+(done?' checked':'')+'><span>八上二段國文複習'+info+'<span class="score" data-score="'+(sc==null?'':sc)+'" data-label="小測驗"></span></span></label>';
  var cards=$$('.card',root),dc=cards.find(function(c){var h=$('h2',c);return h&&h.textContent==='每日必做'});
  if(dc)dc.insertAdjacentHTML('beforeend',row);else{var note=cards.find(function(c){return $('textarea',c)});var nc=document.createElement('div');nc.className='card';nc.innerHTML='<h2>每日必做</h2>'+row;root.insertBefore(nc,note||null)}})();
 var els=$$('input[type=checkbox],textarea',root).filter(function(e){return !e.classList.contains('cr-auto')&&e.id!=='pconfirm'});
 $$('input.cr-auto',root).forEach(function(cb){cb.addEventListener('click',function(e){e.preventDefault()})});
 els.forEach(function(e,i){if(i in S){if(e.type==='checkbox')e.checked=!!S[i];else e.value=S[i]}});
 /* 科目測驗完成 → 自動打勾＋分數 */
 $$('input[data-subj]',root).forEach(function(cb){var subj=cb.dataset.subj,q=LS.get('roby-quiz-'+subj+'-'+DATE,null),sp=$('.score',cb.parentNode);
  if(q&&q.completed_at){cb.checked=true;if(sp&&q.score!=null)sp.dataset.score=q.score}else if(cb.dataset.crdone){cb.checked=true}});
 $$('.score',root).forEach(function(s){var v=(s.dataset.score||'').trim(),n=parseFloat(v),lb=s.dataset.label||'小測驗';s.className='score '+(v===''||isNaN(n)?'sc-none':n>=90?'sc-hi':n>=70?'sc-mid':'sc-low');s.textContent=lb+' '+(v===''?'—':v+' 分')});
 function save(){els.forEach(function(x,j){S[j]=x.type==='checkbox'?x.checked:x.value});LS.set(K,S)}
 save();
 $$('input[data-excl]',root).forEach(function(e){e.addEventListener('change',function(){if(e.checked)$$('input[data-excl="'+e.dataset.excl+'"]',root).forEach(function(o){if(o!==e){o.checked=false}});save();progress()})});
 /* 計時 */
 TM.K=K;TM.S=S;TM.els=els;TM.logs={};TM.save=save;
 $$('[data-t] label',root).forEach(function(l){var cb=$('input',l),i=els.indexOf(cb),w=document.createElement('div');w.className='trow';l.parentNode.insertBefore(w,l);w.appendChild(l);
  var b=document.createElement('button');b.className='tbtn noprint';b.textContent='▶ 開始';b.onclick=function(){tStart(i)};w.appendChild(b);
  var d=document.createElement('div');d.className='tlog';w.after(d);TM.logs[i]=d;tRender(i)});
 els.forEach(function(e,i){e.addEventListener(e.type==='checkbox'?'change':'input',function(){if(e.type==='checkbox'&&TM.logs[i]&&e.checked){var T=getT();if(T&&T.i==i)setT(null);if(S.t[i]&&S.t[i].s)tFinish(i)}save();progress();
  if(e.id==='confirm'&&e.checked){bud.say('謝謝你自己檢查！小猴子幫你送出囉 📮');sendChecklist('confirm')}})});
 /* 家長確認（取代手指簽名＋存圖）：Roby 先確認 → 家長 PIN → 寫每日紀錄＋送出佇列 → 鎖定當天 */
 var pc=$('#pconfirm',root),pst=$('#pcst',root);
 function lockUI(){var L=!!S.locked;els.forEach(function(x){x.disabled=L});$$('.tbtn',root).forEach(function(x){x.disabled=L});pc.checked=!!(S.parent&&S.parent.at);root.classList.toggle('day-locked',L);
  $('#pcunlock',root).style.display=L?'':'none';
  pst.innerHTML=(S.parent&&S.parent.at?'✅ 家長已確認：'+esc(S.parent.text||'')+(L?'・今天的勾選已鎖定':''):(S.parent_prev?'已解鎖修改中，改好後請家長再確認一次':'Roby 勾「Roby 確認」後，家長再打勾並輸入 PIN'))+(S.sig||S.sigAt?'<br>（舊版手指簽名紀錄：'+esc(S.sigAt||'有')+'）':'')}
 pc.addEventListener('click',function(e){e.preventDefault();if(S.parent&&S.parent.at){toast2('今天已確認；要修改請按「解鎖修改」');return}
  if(!$('#confirm',root).checked){toast2('要先由 Roby 勾「Roby 確認」');bud.say('請 Roby 先勾「Roby 確認」，再請家長確認喔！');return}
  withPin('家長確認',function(){save();S.parent={at:nowIso(),text:tpeNowText()+' '+hm(Date.now())};S.locked=true;delete S.parent_prev;LS.set(K,S);var rec=buildRec();LS.set('roby-daily-'+DATE,rec);sendChecklist('parent');lockUI();toast2('家長確認完成，已存今日紀錄');bud.say('家長確認完成！今天辛苦了 🎉')})});
 $('#pcunlock',root).onclick=function(){withPin('解鎖今天的檢查',function(){S.locked=false;S.parent_prev=S.parent;S.parent=null;LS.set(K,S);lockUI();toast2('已解鎖，可以修改；改好請再確認一次')})};
 $('#pcchg',root).onclick=function(){pinChange()};
 $('#pcexp',root).onclick=function(){dlJSON('Roby檢查_'+DATE+'.json',dailyRec(DATE)||buildRec())};
 function buildItems(){var items=[];$$('.card',root).forEach(function(cd){var sec=($('h2',cd)||{}).textContent||'';$$('label',cd).forEach(function(l){var cb=$('input',l);if(!cb||cb.id==='confirm'||cb.id==='pconfirm')return;var t=$('span',l).cloneNode(true),sc=$('.score',t);if(sc)sc.remove();
  var i=els.indexOf(cb),tt=S.t[i];items.push({section:sec.replace(/（.*/,''),text:t.textContent.trim(),checked:cb.checked,score:sc&&sc.dataset.score!==''?+sc.dataset.score:null,focus:tt&&tt.s?{start:hm(tt.s),end:tt.e?hm(tt.e):null,minutes:Math.floor(tTot(tt)/60e3)}:null})})});return items}
 function buildRec(){var items=buildItems(),cbs=$$('input[data-excl="cb"]',root),main=items.filter(function(x){return !/聯絡簿未帶/.test(x.text)}),dn=main.filter(function(x){return x.checked}).length;
  var qs=function(k){var q=LS.get('roby-quiz-'+k+'-'+DATE,null);return q&&q.completed_at&&q.score!=null?+q.score:null},cr=(LS.get('roby-cr-days',{})[DATE])||null;
  var fo=items.filter(function(x){return x.focus}).map(function(x){return {text:x.text,start:x.focus.start,end:x.focus.end,minutes:x.focus.minutes}});
  return {schema:'roby-daily/1',date:DATE,items:items,done:dn,total:main.length,rate:main.length?Math.round(dn/main.length*100):0,
   contact_book:cbs[0]&&cbs[0].checked?'signed':cbs[1]&&cbs[1].checked?'missing':'none',
   scores:{english:qs('english'),chinese_review:cr&&cr.first&&cr.score!=null?+cr.score:null,chinese_quiz:qs('chinese')},
   focus:fo,focus_minutes:fo.reduce(function(a,x){return a+(x.minutes||0)},0),note:($('textarea',root)||{}).value||'',
   roby_confirmed:!!($('#confirm',root)||{}).checked,parent_confirmed_at:S.parent&&S.parent.at||null,legacy_signed_at:S.sigAt||null,saved_at:nowIso()}}
 function sendChecklist(by){var items=buildItems(),rec=buildRec();
  var cbs=$$('input[data-excl="cb"]',root);
  enqueue('checklist',{subject:'checklist',date:DATE,by:by,items:items,done:items.filter(function(x){return x.checked}).length,total:items.length,
   contact_book:cbs[0]&&cbs[0].checked?'signed':cbs[1]&&cbs[1].checked?'missing':'none',note:($('textarea',root)||{}).value||'',confirmed:!!($('#confirm',root)||{}).checked,parent_confirmed:!!(S.parent&&S.parent.at),parent_confirmed_at:S.parent&&S.parent.at||null,signed:!!(S.parent&&S.parent.at),signed_at:S.parent&&S.parent.text||S.sigAt||null,daily:rec,sent_at:nowIso()},'checklist-'+DATE);}
 var shown=false;
 function progress(){var cbs=els.filter(function(e){return e.type==='checkbox'&&!e.closest('label.alt')}),left=cbs.filter(function(e){return !e.checked}).length;
  if(!left){bud.say(bud.L.done);if(!shown){shown=true;var im=$('img',bud);im.classList.remove('jump');void im.offsetWidth;im.classList.add('jump');celebrate(true)}}
  else{shown=false;bud.say(left===cbs.length?bud.L.greet:bud.L.left.replace('{n}',left))}}
 shown=els.filter(function(e){return e.type==='checkbox'&&!e.closest('label.alt')}).every(function(e){return e.checked});progress();tTick();lockUI();}
function dueFmt(d){if(/^\d{4}-\d{2}-\d{2}$/.test(d))return mdw(d)+'前';return d}
function getT(){return LS.get(TK,null)}
function setT(t){t?LS.set(TK,t):localStorage.removeItem(TK);tTick()}
function tTot(t){return (t.acc||0)+(t.run?Date.now()-t.run:0)}
function tRender(i){var t=TM.S.t[i]||{},d=TM.logs[i];if(!d)return;var s='開始 '+(t.s?hm(t.s):'—')+'｜結束 '+(t.e&&!t.on?hm(t.e):'—')+'｜共 '+Math.floor(tTot(t)/60e3)+' 分';d.textContent=s}
function tName(i){var e=TM.els[i];return e?$('span',e.closest('label')).textContent:''}
function tPause(i,at){var t=TM.S.t[i];if(t&&t.run){t.acc=(t.acc||0)+Math.max(0,(at||Date.now())-t.run);t.run=null}}
function tFinish(i){var t=TM.S.t[i];if(!t||!t.s)return;tPause(i);t.e=Date.now();t.on=false;tRender(i);TM.save()}
function tStart(i){if(TM.S&&TM.S.locked){toast2('今天已家長確認並鎖定');return}var T=getT();if(T&&T.i==i&&T.k===TM.K)return;if(T&&!confirm('已經有一個計時在進行（'+tName(T.i)+'），要結束它改計時這一項嗎？'))return;if(T)tFinish(T.i);
 var t=TM.S.t[i]=TM.S.t[i]||{acc:0};if(!t.s)t.s=Date.now();t.run=Date.now();t.on=true;t.e=null;TM.save();tRender(i);setT({k:TM.K,i:i,ph:'f',end:Date.now()+FOCUS})}
function beep(n){try{var ac=beep.ac=beep.ac||new (window.AudioContext||window.webkitAudioContext)();for(var k=0;k<n;k++){var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;o.connect(g);g.connect(ac.destination);var t0=ac.currentTime+k*.5;g.gain.setValueAtTime(.4,t0);g.gain.exponentialRampToValueAtTime(.001,t0+.4);o.start(t0);o.stop(t0+.4)}}catch(e){}}
function fmtc(ms){var s=Math.ceil(Math.max(0,ms)/1000);return p2(Math.floor(s/60))+':'+p2(s%60)}
function tTick(){var ov=$('#tov'),T=getT();if(!TM.K||!$('.tlog')){ov.style.display='none';document.body.classList.remove('timing');return}
 if(T&&T.k!==TM.K){T=null;localStorage.removeItem(TK)}for(var i in TM.logs)tRender(i);
 if(!T){ov.style.display='none';document.body.classList.remove('timing');return}
 ov.style.display='block';document.body.classList.add('timing');ov.className=T.ph==='f'?'focus':'rest';var left=T.paused!=null?T.paused:T.end-Date.now();
 if(left<=0&&T.paused==null){if(T.ph==='f'){tPause(T.i,T.end);TM.save();beep(3);T={k:TM.K,i:T.i,ph:'r',end:Date.now()+REST};LS.set(TK,T);left=REST;setTimeout(function(){alert('25 分鐘到了！休息 5 分鐘 ☕')},50)}
  else{beep(2);localStorage.removeItem(TK);ov.style.display='none';document.body.classList.remove('timing');setTimeout(function(){alert('休息結束！可以按「開始」再專注一輪 💪')},50);return}}
 $('.tname',ov).textContent=tName(T.i);$('.tphase',ov).textContent=T.ph==='f'?'🍅 專注中':'☕ 休息 5 分鐘（不計入）';$('.tclock',ov).textContent=fmtc(left);$('.tp',ov).textContent=T.paused!=null?'▶ 繼續':'⏸ 暫停'}
$('#tov .tp').onclick=function(){var T=getT();if(!T)return;if(T.paused!=null){T.end=Date.now()+T.paused;delete T.paused;if(T.ph==='f'){TM.S.t[T.i].run=Date.now();TM.save()}}else{T.paused=T.end-Date.now();if(T.ph==='f'){tPause(T.i);TM.save()}}setT(T)};
$('#tov .tx').onclick=function(){if(confirm('結束這次計時？')){var T=getT();if(T)tFinish(T.i);setT(null)}};
setInterval(tTick,1000);

/* ---------- 錯題本頁 ---------- */
var wbFilter='all',wbTopic='all';
function wrongPage(root){var bud=buddy('check',null);bud.L.name='小猴子';root.appendChild(bud);
 var h=document.createElement('h1');h.textContent='錯題本';root.appendChild(h);
 var a=LS.get(WBK,[]),f=document.createElement('div');f.className='filt noprint';
 [['all','全部'],['chinese','國文'],['english','英文'],['todo','還沒訂正']].forEach(function(x){var b=document.createElement('button');b.textContent=x[1];if(wbFilter===x[0])b.className='on';b.onclick=function(){wbFilter=x[0];render()};f.appendChild(b)});root.appendChild(f);
 var f2=document.createElement('div');f2.className='filt noprint topic-filt';[['all','全部'],['形音義','形音義'],['注音','注音'],['改錯','改錯'],['閱讀','閱讀']].forEach(function(x){var n=x[0]==='all'?'':' '+a.filter(function(y){return y.topic===x[0]}).length;var b=document.createElement('button');b.dataset.topic=x[0];b.textContent=x[1]+n;if(wbTopic===x[0])b.className='on';b.onclick=function(){wbTopic=x[0];render()};f2.appendChild(b)});root.appendChild(f2);
 var SN={chinese:'國文',english:'英文'},subs=[];a.forEach(function(x){if(subs.indexOf(x.subject)<0)subs.push(x.subject)});
 if(subs.length){var f3=document.createElement('div');f3.className='clr-row noprint';subs.forEach(function(sj){var nm=SN[sj]||sj,b=document.createElement('button');b.className='clr';b.dataset.subj=sj;b.textContent='🧹 清空'+nm+'錯題';
  b.onclick=function(){var n=LS.get(WBK,[]).filter(function(y){return y.subject===sj}).length;if(!confirm('確定要清空「'+nm+'」的 '+n+' 題錯題嗎？清空後無法復原。'))return;
   LS.set(WBK,LS.get(WBK,[]).filter(function(y){return y.subject!==sj}));if(sj==='chinese'){localStorage.removeItem('roby-cr-wrong');localStorage.removeItem('roby-cr-weak')}render()};f3.appendChild(b)});root.appendChild(f3)}
 var list=a.filter(function(x){return (wbFilter==='all'||(wbFilter==='todo'?!x.fixed:x.subject===wbFilter))&&(wbTopic==='all'||x.topic===wbTopic)});
 bud.say(a.length?'這裡有 '+a.length+' 題錯過的題目，考前拿出來複習最有用！':'錯題本是空的，太厲害了！');
 if(!list.length){root.appendChild(empty('這裡還沒有錯題 ✨','monkey-head.png'));return}
 var c=card(root,'');list.forEach(function(x){var e=document.createElement('div');e.className='wb';
  e.innerHTML='<div class="meta">'+(x.subject==='english'?'英文':x.subject==='chinese'?'國文':esc(x.subject))+'・'+md(x.date)+'・'+esc(x.id)+(x.topic?'・<span class="tp">'+esc(x.topic)+'</span>':'')+(x.fixed?'・<span class="ok-tag">已訂正</span>':'・<span class="no">未訂正</span>')+'</div><div'+(x.words?' class="wbp"':'')+'>'+esc(x.question)+'</div>'+(x.words?wbPairs(x):'')+
  '<div>你的答案：<span class="yours">'+esc(x.yours)+'</span>　正解：<span class="ans">'+esc(x.answer)+'</span></div>'+(x.explanation?'<div class="exp">💡 '+esc(x.explanation)+'</div>':'')+'<button class="noprint del" style="float:right">我會了，移除</button><div style="clear:both"></div>';
  $('.del',e).onclick=function(){LS.set(WBK,LS.get(WBK,[]).filter(function(y){return y.key!==x.key}));render()};c.appendChild(e)});}

function wbPairs(x){var bad={};(x.words||[]).forEach(function(w){bad[w.wrong+w.right]=w.status});var lab={half:'寫錯',missed:'沒找到',self:'自評對'};
 return '<div class="pairs">'+String(x.answer||'').split('、').map(function(p){var m=p.match(/^(.)→(.)（(.*)）$/);if(!m)return '';var st=bad[m[1]+m[2]];
  return '<span class="pair'+(st&&st!=='self'?' bad':'')+'"><s>'+esc(m[1])+'</s>→<b>'+esc(m[2])+'</b> <small>'+esc(m[3])+(st?'・'+lab[st]:'')+'</small></span>'}).join('')+((x.false_clicks||[]).length?'<span class="pair bad">點錯：'+esc(x.false_clicks.join('、'))+'</span>':'')+'</div>'}
/* ---------- 週報 ---------- */
function weeklyPage(root){var D=DATA.weekly||DATA.weeklyPrev;root.insertAdjacentHTML('beforeend','<img class="hero" src="monkey-hero.webp" alt="">');
 var LREC=dailyRange(WK,addDays(WK,6)),LOC=false;
 if(D&&D.week_start&&D.week_start!==WK&&LREC.length){D={week_start:WK,days:[]};LOC=true}
 if(!D){if(!LREC.length){root.appendChild(empty('這週還沒有週報喔（週日更新）','cat-foot.webp'));return}D={week_start:WK,days:[]};LOC=true}
 var mon=D.week_start||(DATA.weekly?WK:PREVWK),sun=addDays(mon,6),WREC=dailyRange(mon,sun),WA=aggDaily(WREC);
 var html='<h1>Roby 週報</h1><div class="sub">'+md(mon)+'（一）～ '+md(sun)+'（日）</div>';if(D.sample)html+='<div class="sample">⚠️ 範例資料</div>';
 var O=D.overview||{},pct=function(a,b){return b?Math.round(a/b*100):0};if(LOC)O={planDone:WA.done,planTotal:WA.total,contact:WA.contact,contactMissing:WA.contactMissing,english:WA.english.days,chinese:WA.chinese_review.days};
 var isN=function(v){return typeof v==='number'||(typeof v==='string'&&/^\d+(\.\d+)?$/.test(v.trim()))},sc=function(v){return v>=90?'sc-hi':v>=70?'sc-mid':'sc-low'};
 var hasCh=(D.days||[]).some(function(d){return d.chinese!=null}),chN=(D.days||[]).filter(function(d){return isN(d.chinese)}).length;
 var chD=O.chinese!=null?O.chinese+'/7 天':hasCh?chN+'/7 天':'—';
 var avgOf=function(k){var a=(D.days||[]).filter(function(d){return isN(d[k])}).map(function(d){return +d[k]});return a.length?Math.round(a.reduce(function(x,y){return x+y},0)/a.length):null};
 var avgP=['english','chinese'].map(function(k){var a=avgOf(k);return a==null?'':'<span class="wavg">'+(k==='english'?'英文':'國文')+'大師平均 <b class="'+sc(a)+'">'+a+' 分</b></span>'}).filter(Boolean).join('　');if(avgP)avgP='<p>'+avgP+'</p>';
 html+='<div class="card"><h2>本週總覽</h2><p>讀書計畫完成率：'+pct(O.planDone,O.planTotal)+'%（'+(O.planDone||0)+' / '+(O.planTotal||0)+' 項）</p><div class="bar" style="height:10px;border-radius:5px;overflow:hidden"><div style="height:100%;width:'+pct(O.planDone,O.planTotal)+'%"></div></div><p>每日必做：聯絡簿 '+(O.contact||0)+'/7 天'+(O.contactMissing?'（未帶 '+O.contactMissing+' 天）':'')+'、英文大師 '+(O.english||0)+'/7 天、國文大師 '+chD+'</p>'+avgP+'<p>家長確認天數：'+(WREC.length?WA.parent:O.parentConfirmed!=null?O.parentConfirmed:(O.signed||0))+'/7</p>'+(LOC?'<p class="small">本週文字週報尚未產生，以下為本機每日紀錄彙總。</p>':'')+'</div>';
 if(WREC.length)html+=aggCard('本週 App 紀錄彙總',WA,7,WREC);
 html+='<div class="card noprint"><h2>同步本週紀錄</h2><p class="small">把本週每日紀錄＋筆記加點打包成 JSON：下載後存到 OneDrive「Roby週報」，同時放進送出佇列（webhook 設好後自動送）。</p><button id="wsync">📦 同步本週紀錄（'+WREC.length+' 天）</button></div>';
 var RD={};WREC.forEach(function(r){RD[r.date]=r});
 var DAYS=[];for(var di=0;di<7;di++){var dd0=addDays(mon,di),jd=(D.days||[]).filter(function(x){return x.date===dd0})[0]||{date:dd0},r0=RD[dd0],o=Object.assign({},jd);
  if(r0){var sc0=r0.scores||{};if(o.plan==null)o.plan=r0.done+'/'+r0.total;if(o.contact==null)o.contact=r0.contact_book==='signed'?true:r0.contact_book==='missing'?false:null;
   if(o.english==null&&sc0.english!=null)o.english=sc0.english;
   if(o.chinese==null){var cv=sc0.chinese_review!=null?sc0.chinese_review:sc0.chinese_quiz;if(cv!=null)o.chinese=cv}
   if(o.parentConfirmed==null)o.parentConfirmed=!!r0.parent_confirmed_at}
  DAYS.push(o)}
 html+='<div class="card"><h2>每日完成狀況</h2><table><tr><th></th>'+DAYS.map(function(d){return '<th>'+md(d.date)+'<br>'+WD[dobj(d.date).getDay()]+'</th>'}).join('')+'</tr>';
 [['plan','讀書計畫'],['contact','聯絡簿'],['english','英文大師'],['chinese','國文大師'],['signed','家長確認']].forEach(function(r){html+='<tr><td>'+r[1]+'</td>'+DAYS.map(function(d){var v=r[0]==='signed'&&d.parentConfirmed!=null?d.parentConfirmed:d[r[0]],g=(r[0]==='english'||r[0]==='chinese');return '<td>'+(v===true?'✓':v===false?'':v==null?(g?'—':''):g&&isN(v)?'<b class="'+sc(+v)+'">'+esc(v)+'</b>':esc(v))+'</td>'}).join('')+'</tr>'});html+='</table></div>';
 if((D.homework||[]).length)html+='<div class="card"><h2>家教／補習功課</h2><table><tr><th>項目</th><th>期限</th><th>狀態</th></tr>'+D.homework.map(function(h){return '<tr><td>'+esc(h.name)+'</td><td>'+esc(h.due||'')+'</td><td class="'+(h.ok?'ok':h.ok===false?'no':'')+'">'+esc(h.status||'')+'</td></tr>'}).join('')+'</table></div>';
 html+='<div class="card" id="notes"><h2>筆記與加點</h2><p class="small">筆記不定期才有，沒有就留空。一科可以新增好幾筆，選日期再點加點（再點一次取消）。</p><div id="subjs"></div><p>本週加點：<b id="wsum">0</b> 點・累計點數：<b id="tot">0</b> 點</p></div>';
 [['pending','未完成／延後項目'],['highlights','本週亮點'],['next','下週提醒與建議']].forEach(function(k){if((D[k[0]]||[]).length)html+='<div class="card"><h2>'+k[1]+'</h2><ul>'+D[k[0]].map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ul></div>'});
 if(D.parentNote)html+='<div class="card"><h2>家長備註</h2><p>'+esc(D.parentNote)+'</p></div>';
 html+='<div class="card pcard"><h2>家長確認</h2><label class="pc-l"><input type="checkbox" id="wpc"><span>家長已看過本週週報（需 PIN）</span></label><p id="wpcst" class="small"></p></div><button id="save" class="noprint" style="width:100%">完成並存成圖片</button>';
 var w=document.createElement('div');w.innerHTML=html;while(w.firstChild)root.appendChild(w.firstChild);
 /* 筆記加點：存 roby-weekly-notes-<週一> */
 var NK='roby-weekly-notes-'+mon,N=LS.get(NK,{}),base=+D.base||0,subs=D.noteSubjects||['國文','理化','社會'];
 function sum(){var t=0;subs.forEach(function(s){(N[s]||[]).forEach(function(r){t+=+r.p||0})});$('#wsum').textContent=t;$('#tot').textContent=base+t;LS.set(NK,N)}
 function opts(sel){var o='';for(var i=0;i<7;i++){var d=addDays(mon,i);o+='<option value="'+d+'"'+(d===sel?' selected':'')+'>'+md(d)+'（'+'一二三四五六日'[i]+'）</option>'}return o}
 subs.forEach(function(s){N[s]=N[s]||[];var e=document.createElement('div');e.className='subj';e.innerHTML='<div class="sh"><b>'+esc(s)+'筆記</b><button class="add noprint">＋ 新增一筆</button></div><div class="rows"></div>';$('#subjs').appendChild(e);
  function rows(){var rw=$('.rows',e);rw.innerHTML='';N[s].forEach(function(r,j){var d=document.createElement('div');d.className='row';d.style.justifyContent='flex-start';
   d.innerHTML='<select>'+opts(r.d)+'</select><span class="pts">'+[1,3,5].map(function(p){return '<button class="'+(+r.p===p?'on':'')+'">'+p+'</button>'}).join('')+'</span><button class="del noprint">✕</button>';
   $('select',d).onchange=function(){r.d=this.value;sum()};$$('.pts button',d).forEach(function(b){b.onclick=function(){r.p=+r.p===+b.textContent?0:+b.textContent;rows();sum()}});
   $('.del',d).onclick=function(){N[s].splice(j,1);rows();sum()};rw.appendChild(d)})}
  $('.add',e).onclick=function(){N[s].push({d:DATE>=mon&&DATE<=sun?DATE:mon,p:0});rows();sum()};rows()});sum();
 var WCK='roby-weekly-confirm-'+mon,wpc=$('#wpc'),wst=$('#wpcst');function wdraw(){var c=LS.get(WCK,null),old=LS.get('roby-weekly-sig-'+mon,null);wpc.checked=!!c;wst.innerHTML=(c?'✅ 家長確認：'+esc(c.text):'打勾並輸入家長 PIN')+(old&&old.date?'<br>（舊版簽名：'+esc(old.date)+'）':'')}wdraw();
 wpc.addEventListener('click',function(e){e.preventDefault();if(LS.get(WCK,null)){toast2('本週已確認');return}withPin('家長確認週報',function(){LS.set(WCK,{at:nowIso(),text:tpeNowText()+' '+hm(Date.now())});wdraw();toast2('週報已確認')})});
 $('#wsync').onclick=function(){syncRange('weekly-sync','本週紀錄',mon,sun,{week_start:mon,notes:N,base:base,points_week:+$('#wsum').textContent,points_total:+$('#tot').textContent,parent_confirm:LS.get(WCK,null)},'Roby週紀錄_'+mon+'.json')};
 $('#save').onclick=function(){savePNG(root,'Roby週報_'+mon.slice(5).replace('-','')+'.png')};}
function sigPad(c,K,dl,clr){setTimeout(function(){var r=window.devicePixelRatio||1,w=c.clientWidth||600,h=c.clientHeight||150;c.width=w*r;c.height=h*r;var x=c.getContext('2d');x.scale(r,r);x.lineWidth=2.5;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#5b4636';
 var S=LS.get(K,{});if(S.img){var im=new Image();im.onload=function(){x.drawImage(im,0,0,w,h)};im.src=S.img}if(S.date)dl.textContent='簽名日期：'+S.date;
 var dn=false,P=function(e){var b=c.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top]};
 c.onpointerdown=function(e){dn=true;c.setPointerCapture&&c.setPointerCapture(e.pointerId);x.beginPath();var p=P(e);x.moveTo(p[0],p[1]);e.preventDefault()};
 c.onpointermove=function(e){if(dn){var p=P(e);x.lineTo(p[0],p[1]);x.stroke()}};
 c.onpointerup=c.onpointercancel=function(){if(!dn)return;dn=false;S={img:c.toDataURL('image/png'),date:tpeNowText()};dl.textContent='簽名日期：'+S.date;LS.set(K,S)};
 clr.onclick=function(){x.clearRect(0,0,c.width,c.height);localStorage.removeItem(K);dl.textContent='簽名日期：—'}},0)}

/* ---------- 月報 ---------- */
function monthlyPage(root){var D=DATA.monthly||DATA.monthlyPrev;root.insertAdjacentHTML('beforeend','<img class="hero" src="cat-foot.webp" alt="">');
 if(!D){var cy=+DATE.slice(0,4),cm=+DATE.slice(5,7);if(dailyRange(DATE.slice(0,8)+'01',DATE).length)D={year:cy,month:cm};else{root.appendChild(empty('這個月還沒有月報喔（每月 1 日更新）','cat-foot.webp'));return}}
 var cy0=+DATE.slice(0,4),cm0=+DATE.slice(5,7);if((D.year!==cy0||D.month!==cm0)&&!DATA.monthly&&dailyRange(DATE.slice(0,8)+'01',DATE).length)D={year:cy0,month:cm0};
 var Y=D.year,M=D.month,last=new Date(Y,M,0).getDate(),pct=function(a,b){return b?Math.round(a/b*100):0};
 var bar=function(l,v,mx,t,cls){return '<div class="br"><span>'+esc(l)+'</span><div class="bar"><div style="width:'+pct(v,mx)+'%;'+(cls?'background:#b5835a!important':'')+'"></div></div><span>'+t+'</span></div>'};
 var P=D.plan||{},dl=D.daily||{},dd=dl.days||last,fm=D.focusMinutes||{},tot=Object.keys(fm).reduce(function(a,k){return a+fm[k]},0),mx=Math.max.apply(null,Object.keys(fm).map(function(k){return fm[k]}).concat([1]));
 var m1=Y+'-'+p2(M)+'-01',mL=Y+'-'+p2(M)+'-'+p2(last),MREC=dailyRange(m1,mL),MA=aggDaily(MREC);
 var html='<h1>Roby 月報　'+Y+' 年 '+M+' 月</h1><div class="sub">'+M+'/1 ～ '+M+'/'+last+'</div>'+(D.sample?'<div class="sample">⚠️ 範例資料（版面預覽用，非真實紀錄）</div>':'');
 html+='<div class="card"><h2>本月總覽</h2><div class="kpi"><div>讀書計畫完成率<b>'+pct(P.done,P.total)+'%</b><small>'+(P.done||0)+' / '+(P.total||0)+' 項</small></div><div>聯絡簿<b>'+(dl.contact||0)+' / '+dd+' 天</b>'+(dl.contactMissing?'<small>未帶 '+dl.contactMissing+' 天</small>':'')+'</div><div>英文大師<b>'+(dl.english||0)+' / '+dd+' 天</b>'+(dl.englishAvg!=null?'<small>平均 <span class="'+(dl.englishAvg>=90?'sc-hi':dl.englishAvg>=70?'sc-mid':'sc-low')+'">'+dl.englishAvg+' 分</span></small>':'')+'</div><div>國文大師<b>'+(dl.chinese!=null?dl.chinese+' / '+dd+' 天':'—')+'</b>'+(dl.chineseAvg!=null?'<small>平均 <span class="'+(dl.chineseAvg>=90?'sc-hi':dl.chineseAvg>=70?'sc-mid':'sc-low')+'">'+dl.chineseAvg+' 分</span></small>':'')+'</div><div>專注總時數<b>'+(tot/60).toFixed(1)+' 小時</b></div></div></div>';
 if(MREC.length)html+=aggCard('本月 App 紀錄彙總',MA,last,null);
 html+='<div class="card noprint"><h2>同步本月紀錄</h2><p class="small">打包本月每日紀錄成 JSON（下載存 OneDrive，同時放進送出佇列）。</p><button id="msync">📦 同步本月紀錄（'+MREC.length+' 天）</button></div>';
 if((D.weeks||[]).length)html+='<div class="card"><h2>各週讀書計畫完成率</h2>'+D.weeks.map(function(w){return bar(w.label.replace(/（.*/,''),w.done,w.total,pct(w.done,w.total)+'%（'+w.done+'/'+w.total+'）')}).join('')+'</div>';
 if((D.homework||[]).length)html+='<div class="card"><h2>家教／補習功課準時率</h2><table><tr><th>項目</th><th>準時</th><th>逾期</th><th>準時率</th></tr>'+D.homework.map(function(h){return '<tr><td>'+esc(h.name)+'</td><td class="ok">'+h.ontime+'</td><td class="no">'+h.late+'</td><td>'+pct(h.ontime,h.ontime+h.late)+'%</td></tr>'}).join('')+'</table></div>';
 if(tot)html+='<div class="card"><h2>專注計時（各科時數）</h2>'+Object.keys(fm).map(function(k){return bar(k,fm[k],mx,Math.floor(fm[k]/60)+' 小時 '+(fm[k]%60)+' 分',1)}).join('')+'</div>';
 if((D.scores||[]).length)html+='<div class="card"><h2>國文／英文測驗</h2><table><tr><th>科目</th><th>次數</th><th>平均</th></tr>'+D.scores.map(function(s){return '<tr><td>'+esc(s.subject)+'</td><td>'+s.count+'</td><td>'+s.avg+'</td></tr>'}).join('')+'</table></div>';
 if((D.notes||[]).length)html+='<div class="card"><h2>筆記加點</h2><table><tr><th>科目</th><th>筆數</th><th>本月點數</th></tr>'+D.notes.map(function(n){return '<tr><td>'+esc(n.subject)+'</td><td>'+n.count+'</td><td>'+n.points+'</td></tr>'}).join('')+'</table><p>本月小計：<b>'+D.notes.reduce(function(a,n){return a+n.points},0)+'</b> 點・累計點數：<b>'+(D.pointsTotal||0)+'</b> 點</p></div>';
 [['highlights','本月亮點'],['advice','下月建議']].forEach(function(k){if((D[k[0]]||[]).length)html+='<div class="card"><h2>'+k[1]+'</h2><ul>'+D[k[0]].map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ul></div>'});
 html+='<button id="save" class="noprint" style="width:100%">完成並存成圖片</button>';
 root.insertAdjacentHTML('beforeend',html);$('#save').onclick=function(){savePNG(root,'Roby月報_'+Y+p2(M)+'.png')};$('#msync').onclick=function(){syncRange('monthly-sync','本月紀錄',m1,mL,{year:Y,month:M},'Roby月紀錄_'+Y+p2(M)+'.json')};}

/* ---------- 共用 ---------- */
function empty(msg,img){var cc=(DATA.config||{}).characters||{};if(img==='monkey-head.png'&&cc.monkey&&cc.monkey.avatar)img=cc.monkey.avatar;if(img==='cat-foot.webp'&&cc.cat&&cc.cat.avatar)img=cc.cat.avatar;var d=document.createElement('div');d.className='card empty';d.innerHTML='<img src="'+img+'" alt="">'+esc(msg);return d}
function celebrate(big){var em=['🎉','⭐','🍌','🌸','✨','🐒'];for(var i=0;i<(big?28:14);i++){var s=document.createElement('div');s.className='confetti';s.textContent=em[i%em.length];s.style.left=Math.random()*100+'vw';s.style.animationDelay=Math.random()*.8+'s';document.body.appendChild(s);setTimeout(function(x){x.remove()}.bind(null,s),3600)}
 if(big){var d=document.createElement('div');d.id='done';d.innerHTML='<img src="monkey-head.png" alt="" class="jump"><div>全部完成了！</div><small>小猴子替你開心 · 點一下關閉</small>';d.onclick=function(){d.remove()};document.body.appendChild(d)}}
function savePNG(root,name){document.body.classList.add('capture');var nv=$('#nav'),ck=$('#clkbar');nv.style.visibility='hidden';if(ck)ck.style.visibility='hidden';
 return html2canvas(document.body,{scale:2,backgroundColor:'#f3eee2',useCORS:true}).then(function(c){document.body.classList.remove('capture');nv.style.visibility='';if(ck)ck.style.visibility='';var url=c.toDataURL('image/png');window.__lastPNG=url;
  c.toBlob(function(b){var f=new File([b],name,{type:'image/png'});var show=function(){var d=document.createElement('div');d.id='pngview';d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;z-index:12';
   d.innerHTML='<p style="color:#fff;font-size:17px;text-align:center">長按下方圖片，選「加入照片」或「儲存影像」</p><img src="'+url+'" style="max-width:100%;max-height:75vh;border-radius:8px"><button style="margin-top:14px;padding:10px 24px">關閉</button>';$('button',d).onclick=function(){d.remove()};document.body.appendChild(d)};
   if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:name}).catch(show);else show()},'image/png');}).catch(function(e){document.body.classList.remove('capture');nv.style.visibility='';alert('存圖失敗：'+e)})}

/* ---------- 分頁 ---------- */
var TABS=[['check','今日檢查'],['chinese','國文'],['english','英文'],['wrong','錯題本'],['weekly','週報'],['monthly','月報']],rendered=false;
function cur(){var h=location.hash.slice(1);return TABS.some(function(t){return t[0]===h})?h:'check'}
function render(){rendered=true;var c=cur(),nav=$('#nav');nav.innerHTML='';TABS.forEach(function(t){var b=document.createElement('button');b.textContent=t[1];if(t[0]===c)b.className='on';b.onclick=function(){if(location.hash.slice(1)!==t[0]){history.replaceState(null,'',location.pathname+location.search+'#'+t[0]);render();scrollTo(0,0)}};nav.appendChild(b)});
 var y=scrollY,root=$('#page');root.innerHTML='';TM.K=null;TM.logs={};
 ({check:checkPage,chinese:function(r){subjPage('chinese',r)},english:function(r){subjPage('english',r)},wrong:wrongPage,weekly:weeklyPage,monthly:monthlyPage})[c](root);
 document.title='Roby '+TABS.find(function(t){return t[0]===c})[1];tTick();scrollTo(0,y);}
window.addEventListener('hashchange',render);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')load()});
/* 小時鐘（純顯示台北時間）*/
(function(){var fmt=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 var c=document.createElement('div');c.id='clk';c.innerHTML='<span class="cf"><i class="hh"></i><i class="mm"></i></span><span class="ct">--:--</span><small class="cs"></small>';
 var bar=document.createElement('div');bar.id='clkbar';bar.className='noprint';bar.appendChild(c);document.body.appendChild(bar);
 function tick(){var o={};fmt.formatToParts(new Date()).forEach(function(p){o[p.type]=p.value});$('.ct',c).textContent=o.hour+':'+o.minute;$('.cs',c).textContent=o.second;var h=+o.hour%12,m=+o.minute;$('.hh',c).style.transform='rotate('+(h*30+m/2)+'deg)';$('.mm',c).style.transform='rotate('+(m*6)+'deg)'}
 setInterval(tick,1000);tick();})();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
window.__roby={DATE:DATE,flush:flush,load:load,ansIndex:ansIndex,outbox:function(){return LS.get(OB,[])}};
/* 國文複習頁（iframe）送來的成績 → 走同一個送出佇列 */
window.__roby.enqueue=enqueue;
window.addEventListener('message',function(e){if(e.origin!==location.origin)return;var d=e.data||{};if(d.type!=='roby-review-result'||!d.payload||!d.dedupe)return;enqueue('chinese',d.payload,d.dedupe);if(cur()==='check')render()});
window.addEventListener('storage',function(e){if(e.key==='roby-cr-days'&&cur()==='check')render()});
obStatus();render();load();
})();
