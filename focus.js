(function(){
var K='roby-check-'+'__DATE__',TK='roby-timer',FOCUS=25*60e3,REST=5*60e3;
var els=[...document.querySelectorAll('input[type=checkbox],textarea')];
var S={};try{S=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
if(!S.t)S.t={};
function save(){els.forEach(function(x,j){S[j]=x.type=='checkbox'?x.checked:x.value});localStorage.setItem(K,JSON.stringify(S));}
var hm=function(ms){return new Date(ms).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})};
var logs={};
function tot(t){return (t.acc||0)+(t.run?Date.now()-t.run:0)}
function render(i){var t=S.t[i]||{},d=logs[i];if(!d)return;
 var s='開始 '+(t.s?hm(t.s):'—')+'｜結束 '+(t.e&&!t.on?hm(t.e):'—')+'｜共 '+Math.floor(tot(t)/60e3)+' 分';
 d.textContent=s;els[i].closest('label').dataset.log=t.s?'（'+s+'）':'';}
function renderAll(){for(var i in logs)render(i)}
els.forEach(function(e,i){if(i in S){if(e.type=='checkbox')e.checked=S[i];else e.value=S[i];}});
document.querySelectorAll('[data-timer] label').forEach(function(l){var cb=l.querySelector('input'),i=els.indexOf(cb);
 var w=document.createElement('div');w.className='trow';l.parentNode.insertBefore(w,l);w.appendChild(l);
 var b=document.createElement('button');b.className='tbtn';b.textContent='▶ 開始';b.onclick=function(){start(i)};w.appendChild(b);
 var d=document.createElement('div');d.className='tlog';w.after(d);logs[i]=d;render(i);});
function pauseRun(i,at){var t=S.t[i];if(t&&t.run){t.acc=(t.acc||0)+Math.max(0,(at||Date.now())-t.run);t.run=null}}
function finish(i){var t=S.t[i];if(!t||!t.s)return;pauseRun(i);t.e=Date.now();t.on=false;render(i);save();}
els.forEach(function(e,i){e.addEventListener(e.type=='checkbox'?'change':'input',function(){
 if(e.type=='checkbox'&&logs[i]&&e.checked){var T=getT();if(T&&T.i==i)setT(null);if(S.t[i]&&S.t[i].s)finish(i);}
 save();});});
var ov=document.createElement('div');ov.id='tov';ov.innerHTML='<div class="tname"></div><div class="tphase"></div><div class="tclock">25:00</div><div class="tbtns"><button class="tp">⏸ 暫停</button><button class="tx">■ 結束</button></div>';
document.body.appendChild(ov);var ac;
function getT(){try{return JSON.parse(localStorage.getItem(TK)||'null')}catch(e){return null}}
function setT(t){t?localStorage.setItem(TK,JSON.stringify(t)):localStorage.removeItem(TK);tick();}
function name(i){var s=els[i].closest('label').querySelector('span');return s?s.textContent:''}
function start(i){var T=getT();if(T&&T.i==i)return;
 if(T&&!confirm('已經有一個計時在進行（'+name(T.i)+'），要結束它改計時這一項嗎？'))return;
 if(T){finish(T.i)}
 try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume()}catch(e){}
 var t=S.t[i]=S.t[i]||{acc:0};if(!t.s)t.s=Date.now();t.run=Date.now();t.on=true;t.e=null;save();render(i);
 setT({k:K,i:i,ph:'f',end:Date.now()+FOCUS});}
function beep(n){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();for(var k=0;k<n;k++){var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;o.connect(g);g.connect(ac.destination);var t0=ac.currentTime+k*0.5;g.gain.setValueAtTime(0.4,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+0.4);o.start(t0);o.stop(t0+0.4);}}catch(e){}if(navigator.vibrate)navigator.vibrate([300,150,300]);}
function fmt(ms){ms=Math.max(0,ms);var s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function tick(){var T=getT();if(T&&T.k!==K){T=null;localStorage.removeItem(TK)}
 renderAll();
 if(!T){ov.style.display='none';document.body.classList.remove('timing');return}
 ov.style.display='';document.body.classList.add('timing');ov.className=T.ph=='f'?'focus':'rest';
 var left=T.paused!=null?T.paused:T.end-Date.now();
 if(left<=0&&T.paused==null){if(T.ph=='f'){pauseRun(T.i,T.end);save();beep(3);T={k:K,i:T.i,ph:'r',end:Date.now()+REST};localStorage.setItem(TK,JSON.stringify(T));left=T.end-Date.now();setTimeout(function(){alert('25 分鐘到了！休息 5 分鐘 ☕')},50);}
  else{beep(2);localStorage.removeItem(TK);ov.style.display='none';document.body.classList.remove('timing');setTimeout(function(){alert('休息結束！可以按「開始」再專注一輪 💪')},50);return;}}
 ov.querySelector('.tname').textContent=name(T.i);
 ov.querySelector('.tphase').textContent=T.ph=='f'?'🍅 專注中':'☕ 休息 5 分鐘（不計入）';
 ov.querySelector('.tclock').textContent=fmt(left);
 ov.querySelector('.tp').textContent=T.paused!=null?'▶ 繼續':'⏸ 暫停';}
ov.querySelector('.tp').onclick=function(){var T=getT();if(!T)return;
 if(T.paused!=null){T.end=Date.now()+T.paused;delete T.paused;if(T.ph=='f'){S.t[T.i].run=Date.now();save()}}
 else{T.paused=T.end-Date.now();if(T.ph=='f'){pauseRun(T.i);save()}}setT(T)};
ov.querySelector('.tx').onclick=function(){if(confirm('結束這次計時？')){var T=getT();if(T)finish(T.i);setT(null)}};
setInterval(tick,1000);document.addEventListener('visibilitychange',tick);tick();
})();
(function(){var cbs=[...document.querySelectorAll('input[type=checkbox]')].filter(c=>!c.closest('label.alt')),shown=false;
function chk(){var all=cbs.every(c=>c.checked);if(all&&!shown){shown=true;var d=document.createElement('div');d.id='done';
d.innerHTML='<img src="monkey-head.png" alt=""><div>全部完成了！</div><small>小猴子替你開心 · 點一下關閉</small>';d.onclick=()=>d.remove();document.body.appendChild(d);}if(!all)shown=false;}
cbs.forEach(c=>c.addEventListener('change',chk));})();
